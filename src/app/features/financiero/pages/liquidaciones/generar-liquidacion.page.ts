import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

import {
  selectLiqInsurers, selectLiqGenerating,
  selectLiqPreviewDetail, selectLiqPreviewLoading,
} from '../../store/financiero.selectors';
import {
  loadInsurersIndex, loadPreviewDetail, resetPreviewDetail,
  generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';
import { PreviewItem, ExcludedAnalysisIdsByPs } from '../../models/liquidaciones.model';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Obra social y período' },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones a liquidar' },
];

function toIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'fin-generar-liquidacion-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, CurrencyArPipe, FormsModule, SelectModule, DatePickerModule, WizardShellComponent,
    DataTableComponent, UiCellDirective, UiRowExpansionDirective,
  ],
  template: `
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps"
      [currentIndex]="step()"
      [visited]="visited()"
      [continueDisabled]="!paso1Valido()"
      finishLabel="Generar"
      [finishDisabled]="!canGenerate()"
      [finishLoading]="generating()"
      maxWidth="860px"
      (next)="next()"
      (back)="back()"
      (cancel)="cancelar()"
      (finish)="generar()">

      @if (step() === 0) {
        <div class="step">
          <p class="muted">Elegí la obra social y el período a liquidar.</p>

          <div class="form-field">
            <label for="os">Obra Social <span class="pat-form__req" aria-hidden="true">*</span></label>
            <p-select inputId="os" [options]="insurers()" optionLabel="name" [filter]="true"
                      appendTo="body" [ngModel]="os()" (ngModelChange)="os.set($event)" data-testid="sel-os" />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="from">Desde <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="from" dateFormat="dd/mm/yy" appendTo="body"
                            [ngModel]="from()" (ngModelChange)="from.set($event)" data-testid="inp-from" />
            </div>
            <div class="form-field">
              <label for="to">Hasta <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="to" dateFormat="dd/mm/yy" appendTo="body"
                            [ngModel]="to()" (ngModelChange)="to.set($event)" data-testid="inp-to" />
            </div>
          </div>

          @if (rangoInvalido()) {
            <small class="field-error">La fecha "Desde" no puede ser posterior a "Hasta".</small>
          }
        </div>
      } @else {
        <div class="step">
          <p class="muted">Revisá las prestaciones agrupadas por plan y elegí cuáles incluir. Podés excluir prestaciones enteras o análisis individuales; los montos se recalculan solos.</p>

          @if (preview(); as pv) {
            @if (pv.previewWarning) {
              <div class="liq-warn"><i class="pi pi-exclamation-triangle"></i> {{ pv.previewWarning }}</div>
            }

            <div class="liq-summary">
              <div class="liq-summary__os">
                <span class="liq-summary__name">{{ os()?.name }}</span>
                <span class="liq-summary__period">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span>
                <span class="liq-summary__count">{{ incluidas() }} de {{ totalPrestaciones() }} prestaciones incluidas</span>
              </div>
              <div class="liq-summary__totals">
                <div class="liq-summary__row"><span>Neto</span><span data-testid="preview-net">{{ pv.netAmount | currencyAr }}</span></div>
                <div class="liq-summary__row"><span>IVA</span><span data-testid="preview-iva">{{ pv.ivaAmount | currencyAr }}</span></div>
                <div class="liq-summary__row liq-summary__row--gross"><span>Total con IVA</span><span data-testid="preview-gross">{{ pv.grossAmount | currencyAr }}</span></div>
              </div>
            </div>

            @if (!totalPrestaciones()) {
              <div class="liq-empty"><i class="pi pi-info-circle"></i><span>No hay prestaciones pendientes para esa obra social y período. No se puede generar la liquidación.</span></div>
            } @else {
              @for (g of pv.groups; track g.planId) {
                <div class="liq-group" [attr.data-testid]="'group-' + g.planId">
                  <div class="liq-group__head">
                    <div class="liq-group__title">
                      <span class="liq-group__name">{{ g.planName }}</span>
                      <span class="liq-group__iva">{{ g.ivaPercentage > 0 ? ('IVA ' + g.ivaPercentage + '%') : 'IVA exento' }}</span>
                    </div>
                    <div class="liq-group__totals">
                      <span>Neto {{ g.netAmount | currencyAr }}</span>
                      <span>IVA {{ g.ivaAmount | currencyAr }}</span>
                      <span class="liq-group__gross">Bruto {{ g.grossAmount | currencyAr }}</span>
                    </div>
                  </div>

                  <ui-table
                    [value]="g.items"
                    [columns]="itemColumns"
                    dataKey="providedServiceId"
                    [expandable]="true"
                    [paginator]="g.items.length > rowsPerPage"
                    [rows]="rowsPerPage"
                    entityLabel="prestaciones"
                    emptyHeading="Sin prestaciones en este plan"
                    emptyIcon="pi-inbox">

                    <ng-template uiCell="include" let-it>
                      <input type="checkbox" class="liq-check" [checked]="!it.fullyExcluded"
                             (click)="$event.stopPropagation()" (change)="togglePs(it)"
                             [attr.data-testid]="'ps-' + it.providedServiceId"
                             [attr.aria-label]="'Incluir prestación de ' + it.patientName" />
                    </ng-template>

                    <ng-template uiCell="patientName" let-it>
                      <div class="liq-cell-patient" [class.liq-cell--excluded]="it.fullyExcluded">
                        <span class="liq-cell-patient__name">{{ it.patientName }}</span>
                        <span class="liq-cell-patient__meta">DNI {{ it.patientDni ?? '—' }} · {{ it.analyses.length }} análisis</span>
                      </div>
                    </ng-template>

                    <ng-template uiCell="serviceDate" let-it>
                      {{ it.serviceDate | date:'dd/MM/yy' }}
                    </ng-template>

                    <ng-template uiCell="copaymentAmount" let-it>
                      {{ it.copaymentAmount | currencyAr }}
                    </ng-template>

                    <ng-template uiCell="coveredAmount" let-it>
                      <span class="liq-cell-covered" [class.liq-cell--excluded]="it.fullyExcluded">{{ it.coveredAmount | currencyAr }}</span>
                    </ng-template>

                    <ng-template uiRowExpansion let-it>
                      <div class="liq-analyses">
                        @for (a of it.analyses; track a.analysisId) {
                          <label class="liq-analysis"
                                 [class.liq-analysis--excluded]="a.excluded"
                                 [class.liq-analysis--unauth]="!a.authorized">
                            <input type="checkbox" [checked]="!a.excluded" [disabled]="!a.authorized"
                                   (change)="toggleAnalysis(it.providedServiceId, a.analysisId)"
                                   [attr.aria-label]="'Incluir análisis ' + a.name" />
                            <span class="liq-analysis__code">{{ a.code }}</span>
                            <span class="liq-analysis__name">
                              {{ a.name }}
                              @if (!a.authorized) {
                                <span class="liq-tag-unauth">No cubierto por OS</span>
                              }
                            </span>
                            <span class="liq-analysis__ub">{{ a.ubUnits }} UB</span>
                            <span class="liq-analysis__amount">{{ a.amount | currencyAr }}</span>
                          </label>
                        }
                      </div>
                    </ng-template>
                  </ui-table>
                </div>
              }
            }
          } @else if (previewLoading()) {
            <div class="liq-loading"><i class="pi pi-spin pi-spinner"></i> Calculando prestaciones…</div>
          }
        </div>
      }
    </ui-wizard-shell>
  `,
  styles: [`
    .step { display: flex; flex-direction: column; gap: 16px; }
    .muted { color: var(--ds-text-muted, #64748b); font-size: 13px; margin: 0; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: 13px; font-weight: 500; color: var(--ds-text, #1a1a2e); }
    .form-field p-select, .form-field p-datepicker { display: block; width: 100%; }
    .form-row { display: flex; gap: 14px; }
    .form-row .form-field { flex: 1; min-width: 0; }
    :host ::ng-deep .form-field .p-datepicker { width: 100%; }
    :host ::ng-deep .form-field .p-datepicker .p-inputtext { width: 100%; }
    :host ::ng-deep .form-field .p-select { width: 100%; }
    .field-error { color: #d83a3a; font-size: 12.5px; }

    .liq-warn { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 10px 14px; border-radius: 9px; font-size: 13px; }
    .liq-summary { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-summary__os { display: flex; flex-direction: column; gap: 2px; }
    .liq-summary__name { font-weight: 600; font-size: 15px; }
    .liq-summary__period { font-size: 12.5px; color: #64748b; }
    .liq-summary__count { font-size: 12px; color: #7c8092; }
    .liq-summary__totals { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 180px; }
    .liq-summary__row { display: flex; justify-content: space-between; gap: 18px; width: 100%; font-size: 13px; color: #4a4d63; }
    .liq-summary__row span:last-child { font-variant-numeric: tabular-nums; }
    .liq-summary__row--gross { font-weight: 700; font-size: 16px; color: #0f6b44; padding-top: 3px; border-top: 1px solid #e2e8f0; margin-top: 2px; }

    .liq-empty { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 12px 14px; border-radius: 9px; font-size: 13.5px; }
    .liq-loading { color: #7c8092; font-size: 13.5px; display: flex; align-items: center; gap: 8px; padding: 12px; }

    .liq-group { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .liq-group__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .liq-group__title { display: flex; align-items: baseline; gap: 10px; }
    .liq-group__name { font-weight: 600; font-size: 14.5px; }
    .liq-group__iva { font-size: 12px; color: #64748b; background: #eef2f7; padding: 2px 8px; border-radius: 20px; }
    .liq-group__totals { display: flex; gap: 14px; font-size: 12.5px; color: #64748b; }
    .liq-group__gross { font-weight: 700; color: #0f6b44; }

    .liq-check { width: 17px; height: 17px; cursor: pointer; accent-color: #0f8a55; }
    .liq-cell-patient { display: flex; flex-direction: column; gap: 1px; }
    .liq-cell-patient__name { font-weight: 600; font-size: 13px; }
    .liq-cell-patient__meta { font-size: 11.5px; color: #7c8092; }
    .liq-cell-covered { font-weight: 600; }
    .liq-cell--excluded { opacity: .55; text-decoration: line-through; }

    .liq-analyses { display: flex; flex-direction: column; }
    .liq-analysis { display: grid; grid-template-columns: 22px 70px 1fr auto auto; align-items: center; gap: 10px; padding: 7px 4px; font-size: 12.5px; cursor: pointer; }
    .liq-analysis + .liq-analysis { border-top: 1px solid #eef2f7; }
    .liq-analysis input { accent-color: #0f8a55; }
    .liq-analysis--excluded { color: #94a3b8; }
    .liq-analysis--excluded .liq-analysis__amount { text-decoration: line-through; }
    .liq-analysis--unauth { color: #94a3b8; cursor: not-allowed; }
    .liq-analysis__code { font-family: 'Roboto Mono', monospace; color: #64748b; }
    .liq-analysis__name { display: flex; align-items: center; gap: 8px; }
    .liq-analysis__ub { color: #94a3b8; font-size: 11.5px; }
    .liq-analysis__amount { font-weight: 500; }
    .liq-tag-unauth { font-size: 10.5px; background: #fbeaea; color: #b5740c; padding: 1px 7px; border-radius: 20px; white-space: nowrap; }
  `],
})
export class GenerarLiquidacionPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly destroy = inject(DestroyRef);

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  // form state
  os = signal<InsurerSummary | null>(null);
  protected readonly from = signal<Date | null>(null);
  protected readonly to = signal<Date | null>(null);

  // selección de exclusiones { providedServiceId: [analysisId,...] }
  private readonly excluded = signal<ExcludedAnalysisIdsByPs>({});

  protected readonly rowsPerPage = 10;
  protected readonly itemColumns: readonly TableColumn[] = [
    { field: 'include', header: '' },
    { field: 'patientName', header: 'Paciente' },
    { field: 'serviceDate', header: 'Fecha' },
    { field: 'copaymentAmount', header: 'Copago', align: 'right' },
    { field: 'coveredAmount', header: 'Cubierto', align: 'right' },
  ];

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);
  protected readonly preview = this.store.selectSignal(selectLiqPreviewDetail);
  protected readonly previewLoading = this.store.selectSignal(selectLiqPreviewLoading);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f.getTime() > t.getTime();
  });
  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido());

  /** Todas las prestaciones de todos los grupos, aplanadas. */
  private readonly allItems = computed(() =>
    (this.preview()?.groups ?? []).flatMap(g => g.items));
  protected readonly totalPrestaciones = computed(() => this.allItems().length);
  protected readonly incluidas = computed(() =>
    this.allItems().filter(i => !i.fullyExcluded).length);
  protected readonly canGenerate = computed(() => this.incluidas() > 0);

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.actions$.pipe(ofType(generateSettlementSuccess), takeUntilDestroyed(this.destroy))
      .subscribe(({ settlement }) => this.router.navigate(['/financiero/liquidaciones', settlement.id]));
  }

  ngOnDestroy(): void {
    this.store.dispatch(resetPreviewDetail());
  }

  protected toggleAnalysis(psId: number, analysisId: number): void {
    const cur = { ...this.excluded() };
    const set = new Set(cur[psId] ?? []);
    set.has(analysisId) ? set.delete(analysisId) : set.add(analysisId);
    if (set.size) cur[psId] = [...set]; else delete cur[psId];
    this.excluded.set(cur);
    this.reloadPreview();
  }

  protected togglePs(item: PreviewItem): void {
    const cur = { ...this.excluded() };
    if (item.fullyExcluded) {
      delete cur[item.providedServiceId];               // incluir toda la prestación
    } else {
      cur[item.providedServiceId] = item.analyses.map(a => a.analysisId); // excluir toda la prestación
    }
    this.excluded.set(cur);
    this.reloadPreview();
  }

  private reloadPreview(): void {
    const insurer = this.os();
    if (!insurer) return;
    const excl = this.excluded();
    this.store.dispatch(loadPreviewDetail({
      body: {
        insurerId: insurer.id,
        period: { from: toIso(this.from()), to: toIso(this.to()) },
        excludedAnalysisIdsByPs: Object.keys(excl).length ? excl : null,
      },
    }));
  }

  protected next(): void {
    if (!this.paso1Valido()) return;
    this.excluded.set({});
    this.step.set(1);
    this.visited.update(s => new Set(s).add(1));
    this.reloadPreview();
  }

  protected back(): void {
    this.step.set(0);
  }

  protected generar(): void {
    const insurer = this.os();
    if (!insurer || !this.canGenerate()) return;
    const excl = this.excluded();
    this.store.dispatch(generateSettlement({
      body: {
        insurerId: insurer.id,
        period: { from: toIso(this.from()), to: toIso(this.to()) },
        specialRules: [],
        excludedAnalysisIdsByPs: Object.keys(excl).length ? excl : null,
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
