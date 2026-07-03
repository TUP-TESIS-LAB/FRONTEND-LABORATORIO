import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';

import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

import {
  selectLiqInsurers, selectLiqGenerating, selectLiqInsurerPlans,
  selectLiqPreviewDetail, selectLiqPreviewLoading,
} from '../../store/financiero.selectors';
import {
  loadInsurersIndex, loadInsurerPlans, loadPreviewDetail, resetPreviewDetail,
  generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';
import { PreviewItem, PreviewGroup, ExcludedAnalysisIdsByPs } from '../../models/liquidaciones.model';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Obra social, período y planes' },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones a liquidar' },
  { key: 'confirmar', title: 'Confirmar', subtitle: 'Resumen y generación' },
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
    DatePipe, CurrencyArPipe, FormsModule, SelectModule, MultiSelectModule, DatePickerModule,
    WizardShellComponent, DataTableComponent, UiCellDirective, UiRowExpansionDirective,
  ],
  template: `
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps"
      [currentIndex]="step()"
      [visited]="visited()"
      [continueDisabled]="continueDisabled()"
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
          <p class="muted">Elegí la obra social, el período y los planes a liquidar.</p>

          <div class="form-field">
            <label for="os">Obra Social <span class="pat-form__req" aria-hidden="true">*</span></label>
            <p-select inputId="os" [options]="insurers()" optionLabel="name" [filter]="true"
                      appendTo="body" [ngModel]="os()" (ngModelChange)="onOsChange($event)" data-testid="sel-os" />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="from">Desde <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="from" dateFormat="dd/mm/yy" appendTo="body" [maxDate]="hoy"
                            [ngModel]="from()" (ngModelChange)="from.set($event)" data-testid="inp-from" />
            </div>
            <div class="form-field">
              <label for="to">Hasta <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker inputId="to" dateFormat="dd/mm/yy" appendTo="body" [maxDate]="hoy"
                            [ngModel]="to()" (ngModelChange)="to.set($event)" data-testid="inp-to" />
            </div>
          </div>

          @if (rangoInvalido()) {
            <small class="field-error">La fecha "Desde" no puede ser posterior a "Hasta".</small>
          }

          @if (os()) {
            <div class="form-field">
              <label for="planes">Planes a liquidar <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-multiSelect inputId="planes" [options]="insurerPlans()" optionLabel="name" optionValue="id"
                             [ngModel]="selectedPlanIds()" (ngModelChange)="selectedPlanIds.set($event)"
                             appendTo="body" [showToggleAll]="true" [filter]="insurerPlans().length > 6"
                             placeholder="Elegí los planes" selectedItemsLabel="{0} planes elegidos"
                             emptyMessage="La obra social no tiene planes" data-testid="sel-planes" />
              <small class="muted">Se liquidan solo los planes tildados. Por defecto van todos.</small>
              @if (os() && insurerPlans().length && !selectedPlanIds().length) {
                <small class="field-error">Elegí al menos un plan para liquidar.</small>
              }
            </div>
          }
        </div>
      } @else if (step() === 1) {
        <div class="step">
          <p class="muted">Revisá las prestaciones agrupadas por plan y elegí cuáles incluir. Podés excluir prestaciones enteras, análisis individuales, o usar la selección múltiple para excluir/incluir en lote; los montos se recalculan solos.</p>

          @if (previewLoading() && !preview()) {
            <div class="liq-loading liq-loading--full">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Buscando prestaciones pendientes…</span>
            </div>
          } @else if (preview(); as pv) {
            @if (previewLoading()) {
              <div class="liq-recalc"><i class="pi pi-spin pi-spinner"></i> Recalculando montos…</div>
            }
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

                  <div class="liq-bulk" [attr.data-testid]="'bulk-' + g.planId">
                    <span class="liq-bulk__count">{{ incluidasEnGrupo(g.planId) }} de {{ g.items.length }} incluidas</span>
                    <div class="liq-bulk__actions">
                      <button type="button" class="liq-bulk__btn liq-bulk__btn--ok"
                              data-testid="bulk-incluir" (click)="incluirTodasGrupo(g)">
                        <i class="pi pi-check-circle"></i> Incluir todas
                      </button>
                      <button type="button" class="liq-bulk__btn liq-bulk__btn--danger"
                              data-testid="bulk-excluir" (click)="excluirTodasGrupo(g)">
                        <i class="pi pi-times-circle"></i> Excluir todas
                      </button>
                    </div>
                  </div>

                  <ui-table
                    [value]="g.items"
                    [columns]="itemColumns"
                    dataKey="providedServiceId"
                    [selectable]="true"
                    [selection]="selectionFor(g)"
                    (selectionChange)="onGroupSelectionChange(g, $any($event))"
                    [expandable]="true"
                    [paginator]="true"
                    [rows]="rowsPerPage"
                    [rowsPerPageOptions]="[10, 20, 50, 100]"
                    scrollHeight="46vh"
                    entityLabel="prestaciones"
                    emptyHeading="Sin prestaciones en este plan"
                    emptyIcon="pi-inbox">

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
          }
        </div>
      } @else {
        <div class="step">
          <p class="muted">Revisá el resumen antes de generar la liquidación.</p>

          <div class="liq-confirm">
            <div class="liq-confirm__row"><span class="liq-confirm__label">Obra Social</span><span class="liq-confirm__value">{{ os()?.name }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Período</span><span class="liq-confirm__value">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Planes</span><span class="liq-confirm__value">{{ selectedPlanNames() }}</span></div>
            <div class="liq-confirm__row"><span class="liq-confirm__label">Prestaciones</span><span class="liq-confirm__value">{{ incluidas() }} incluidas · {{ excluidasCount() }} excluidas</span></div>
          </div>

          @if (preview(); as pv) {
            <div class="liq-confirm__plans">
              <span class="liq-confirm__plans-title">Prestaciones por plan</span>
              @for (g of pv.groups; track g.planId) {
                <div class="liq-confirm__plan-row">
                  <span class="liq-confirm__plan-name">{{ g.planName }}</span>
                  <span class="liq-confirm__plan-count">{{ incluidasEnGrupo(g.planId) }} de {{ g.items.length }} prestaciones</span>
                  <span class="liq-confirm__plan-amount">{{ g.netAmount | currencyAr }}</span>
                </div>
              }
            </div>

            <div class="liq-summary liq-summary--confirm">
              <div class="liq-summary__os">
                <span class="liq-summary__count">{{ incluidas() }} de {{ totalPrestaciones() }} prestaciones incluidas</span>
              </div>
              <div class="liq-summary__totals">
                <div class="liq-summary__row"><span>Neto</span><span data-testid="confirm-net">{{ pv.netAmount | currencyAr }}</span></div>
                <div class="liq-summary__row"><span>IVA</span><span data-testid="confirm-iva">{{ pv.ivaAmount | currencyAr }}</span></div>
                <div class="liq-summary__row liq-summary__row--gross"><span>Total con IVA</span><span data-testid="confirm-gross">{{ pv.grossAmount | currencyAr }}</span></div>
              </div>
            </div>
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
    .form-field p-datepicker { display: block; width: 100%; }
    /* flex (no block): PrimeNG usa flex interno; block recorta el label del select a ~1 carácter. */
    .form-field p-select, .form-field p-multiselect { display: flex; width: 100%; }
    .form-row { display: flex; gap: 14px; }
    .form-row .form-field { flex: 1; min-width: 0; }
    :host ::ng-deep .form-field .p-datepicker { width: 100%; }
    :host ::ng-deep .form-field .p-datepicker .p-inputtext { width: 100%; }
    /* display:flex (no block): block rompe el flex interno de PrimeNG y el label se recorta a ~1 carácter. */
    :host ::ng-deep .form-field .p-select { display: flex; width: 100%; }
    :host ::ng-deep .form-field .p-multiselect { display: flex; width: 100%; }
    :host ::ng-deep .form-field .p-select .p-select-label { flex: 1 1 auto; min-width: 0; text-overflow: ellipsis; }
    .field-error { color: #d83a3a; font-size: 12.5px; }

    .liq-warn { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 10px 14px; border-radius: 9px; font-size: 13px; }
    .liq-summary { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-summary--confirm { margin-top: 4px; }
    .liq-summary__os { display: flex; flex-direction: column; gap: 2px; }
    .liq-summary__name { font-weight: 600; font-size: 15px; }
    .liq-summary__period { font-size: 12.5px; color: #64748b; }
    .liq-summary__count { font-size: 12px; color: #7c8092; }
    .liq-summary__totals { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 180px; }
    .liq-summary__row { display: flex; justify-content: space-between; gap: 18px; width: 100%; font-size: 13px; color: #4a4d63; }
    .liq-summary__row span:last-child { font-variant-numeric: tabular-nums; }
    .liq-summary__row--gross { font-weight: 700; font-size: 16px; color: #0f6b44; padding-top: 3px; border-top: 1px solid #e2e8f0; margin-top: 2px; }

    .liq-confirm { display: flex; flex-direction: column; gap: 0; border: 1px solid #e8edf3; border-radius: 10px; overflow: hidden; }
    .liq-confirm__row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 16px; font-size: 13.5px; }
    .liq-confirm__row + .liq-confirm__row { border-top: 1px solid #eef2f7; }
    .liq-confirm__label { color: #7c8092; }
    .liq-confirm__value { font-weight: 600; color: #22243a; text-align: right; }
    .liq-confirm__plans { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e8edf3; border-radius: 10px; }
    .liq-confirm__plans-title { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #7c8092; font-weight: 700; }
    .liq-confirm__plan-row { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; font-size: 13px; }
    .liq-confirm__plan-name { font-weight: 600; }
    .liq-confirm__plan-count { color: #64748b; font-size: 12.5px; }
    .liq-confirm__plan-amount { font-weight: 600; font-variant-numeric: tabular-nums; }

    .liq-empty { display: flex; align-items: center; gap: 8px; background: #fcf1dd; color: #b5740c; padding: 12px 14px; border-radius: 9px; font-size: 13.5px; }
    .liq-loading { color: #7c8092; font-size: 13.5px; display: flex; align-items: center; gap: 8px; padding: 12px; }
    /* Loading grande centrado mientras se buscan las prestaciones (antes de renderizar el paso). */
    .liq-loading--full { flex-direction: column; justify-content: center; align-items: center; gap: 12px;
                         min-height: 260px; color: #64748b; font-size: 14px; }
    .liq-loading--full .pi-spinner { font-size: 30px; color: #0f8a55; }
    /* Indicador sutil de recálculo (los datos ya están; se están recalculando montos). */
    .liq-recalc { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
                  background: #eef4ff; color: #26457a; border: 1px solid #d3e0fb; border-radius: 20px;
                  padding: 4px 12px; font-size: 12.5px; }

    .liq-group { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .liq-group__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .liq-group__title { display: flex; align-items: baseline; gap: 10px; }
    .liq-group__name { font-weight: 600; font-size: 14.5px; }
    .liq-group__iva { font-size: 12px; color: #64748b; background: #eef2f7; padding: 2px 8px; border-radius: 20px; }
    .liq-group__totals { display: flex; gap: 14px; font-size: 12.5px; color: #64748b; }
    .liq-group__gross { font-weight: 700; color: #0f6b44; }

    /* Barra de acción masiva (aparece cuando hay prestaciones tildadas en el grupo). */
    .liq-bulk { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
                padding: 8px 12px; background: #eef4ff; border: 1px solid #d3e0fb; border-radius: 9px; }
    .liq-bulk__count { font-size: 12.5px; font-weight: 600; color: #26457a; }
    .liq-bulk__actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .liq-bulk__btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 7px;
                     border: 1px solid #cbd6ea; background: #fff; color: #4a4d63; font-size: 12.5px; cursor: pointer; }
    .liq-bulk__btn:hover { background: #f4f7fb; }
    .liq-bulk__btn--danger { color: #c0392b; border-color: #f0c4bd; }
    .liq-bulk__btn--danger:hover { background: #fdecea; }
    .liq-bulk__btn--ok { color: #0f6b44; border-color: #c2e3d1; }
    .liq-bulk__btn--ok:hover { background: #eefaf2; }

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
  /** Tope de fecha: hoy — no se pueden liquidar períodos futuros. */
  protected readonly hoy = new Date();
  protected readonly step = signal(0);
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  // form state
  os = signal<InsurerSummary | null>(null);
  protected readonly from = signal<Date | null>(null);
  protected readonly to = signal<Date | null>(null);
  /** Planes tildados de la OS (ids). Por defecto todos; se re-tildan al cambiar de OS. */
  protected readonly selectedPlanIds = signal<number[]>([]);

  // selección de exclusiones { providedServiceId: [analysisId,...] }
  private readonly excluded = signal<ExcludedAnalysisIdsByPs>({});

  protected readonly rowsPerPage = 10;
  protected readonly itemColumns: readonly TableColumn[] = [
    { field: 'patientName', header: 'Paciente' },
    { field: 'serviceDate', header: 'Fecha' },
    { field: 'copaymentAmount', header: 'Copago', align: 'right' },
    { field: 'coveredAmount', header: 'Cubierto', align: 'right' },
  ];

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly insurerPlans = this.store.selectSignal(selectLiqInsurerPlans);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);
  protected readonly preview = this.store.selectSignal(selectLiqPreviewDetail);
  protected readonly previewLoading = this.store.selectSignal(selectLiqPreviewLoading);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f.getTime() > t.getTime();
  });
  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido() && this.selectedPlanIds().length > 0);

  /** Todas las prestaciones de todos los grupos, aplanadas. */
  private readonly allItems = computed(() =>
    (this.preview()?.groups ?? []).flatMap(g => g.items));
  protected readonly totalPrestaciones = computed(() => this.allItems().length);
  protected readonly incluidas = computed(() =>
    this.allItems().filter(i => !i.fullyExcluded).length);
  protected readonly excluidasCount = computed(() => this.totalPrestaciones() - this.incluidas());
  protected readonly canGenerate = computed(() => this.incluidas() > 0);

  /** Botón "Continuar": paso Datos exige form válido; paso Revisar exige ≥1 incluida. */
  protected readonly continueDisabled = computed(() =>
    this.step() === 0 ? !this.paso1Valido() : !this.canGenerate());

  /** Nombres de los planes elegidos, para el resumen del paso Confirmar. */
  protected readonly selectedPlanNames = computed(() => {
    const ids = new Set(this.selectedPlanIds());
    const names = this.insurerPlans().filter(p => ids.has(p.id)).map(p => p.name);
    return names.length ? names.join(', ') : '—';
  });

  constructor() {
    // Al (re)cargar los planes de la OS elegida, tildar todos por defecto.
    effect(() => {
      const plans = this.insurerPlans();
      this.selectedPlanIds.set(plans.map(p => p.id));
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.actions$.pipe(ofType(generateSettlementSuccess), takeUntilDestroyed(this.destroy))
      // Post-generar: volvemos al listado (la nueva liquidación aparece arriba); el toast
      // de éxito ya lo emite el effect.
      .subscribe(() => this.router.navigate(['/financiero/liquidaciones']));
  }

  ngOnDestroy(): void {
    this.store.dispatch(resetPreviewDetail());
  }

  protected onOsChange(insurer: InsurerSummary | null): void {
    this.os.set(insurer);
    this.selectedPlanIds.set([]);
    if (insurer) this.store.dispatch(loadInsurerPlans({ insurerId: insurer.id }));
  }

  protected toggleAnalysis(psId: number, analysisId: number): void {
    const cur = { ...this.excluded() };
    const set = new Set(cur[psId] ?? []);
    set.has(analysisId) ? set.delete(analysisId) : set.add(analysisId);
    if (set.size) cur[psId] = [...set]; else delete cur[psId];
    this.excluded.set(cur);
    this.reloadPreview();
  }

  // ── Inclusión por checkbox (paso Revisar) ─────────────────────────────────
  // El checkbox de cada fila = "incluida". La selección de la tabla ES el conjunto de incluidas;
  // el header "seleccionar todo" incluye/excluye la página. Un solo checkbox por fila (sin duplicar).

  /** Prestaciones incluidas del grupo = las que NO están totalmente excluidas. */
  protected selectionFor(group: PreviewGroup): readonly PreviewItem[] {
    return group.items.filter(i => !i.fullyExcluded);
  }

  /** Cambió el tildado: las que salieron de la selección se excluyen; las que entraron se incluyen. */
  protected onGroupSelectionChange(group: PreviewGroup, rows: PreviewItem[]): void {
    const nowIncluded = new Set((rows ?? []).map(r => r.providedServiceId));
    const cur = { ...this.excluded() };
    let changed = false;
    for (const it of group.items) {
      const wasIncluded = !it.fullyExcluded;
      const isIncluded = nowIncluded.has(it.providedServiceId);
      if (wasIncluded && !isIncluded) {
        cur[it.providedServiceId] = it.analyses.map(a => a.analysisId); // excluir toda la prestación
        changed = true;
      } else if (!wasIncluded && isIncluded) {
        delete cur[it.providedServiceId];                               // incluir toda la prestación
        changed = true;
      }
    }
    if (changed) { this.excluded.set(cur); this.reloadPreview(); }
  }

  /** Incluir todas las prestaciones del plan (quita sus exclusiones). */
  protected incluirTodasGrupo(group: PreviewGroup): void {
    const cur = { ...this.excluded() };
    for (const it of group.items) delete cur[it.providedServiceId];
    this.excluded.set(cur);
    this.reloadPreview();
  }

  /** Excluir todas las prestaciones del plan (todas sus análisis). */
  protected excluirTodasGrupo(group: PreviewGroup): void {
    const cur = { ...this.excluded() };
    for (const it of group.items) cur[it.providedServiceId] = it.analyses.map(a => a.analysisId);
    this.excluded.set(cur);
    this.reloadPreview();
  }

  /** Prestaciones incluidas en un grupo (para el resumen del paso Confirmar). */
  protected incluidasEnGrupo(planId: number): number {
    const g = this.preview()?.groups.find(gr => gr.planId === planId);
    return g ? g.items.filter(i => !i.fullyExcluded).length : 0;
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
        planIds: this.selectedPlanIds(),
      },
    }));
  }

  protected next(): void {
    if (this.step() === 0) {
      if (!this.paso1Valido()) return;
      this.excluded.set({});
      this.step.set(1);
      this.visited.update(s => new Set(s).add(1));
      this.reloadPreview();
    } else if (this.step() === 1) {
      if (!this.canGenerate()) return;
      this.step.set(2);
      this.visited.update(s => new Set(s).add(2));
    }
  }

  protected back(): void {
    this.step.update(s => Math.max(0, s - 1));
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
        planIds: this.selectedPlanIds(),
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
