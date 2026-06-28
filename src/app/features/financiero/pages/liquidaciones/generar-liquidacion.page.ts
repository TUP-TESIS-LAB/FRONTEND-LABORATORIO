import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
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

import {
  selectLiqInsurers, selectLiqPending, selectLiqInsurerPlanIds, selectLiqGenerating,
} from '../../store/financiero.selectors';
import {
  loadInsurersIndex, loadPendingServices, loadInsurerPlans,
  generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Obra social y período' },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones pendientes' },
];

/** Serializa un Date local a 'YYYY-MM-DD' (lo que espera el backend, sin TZ shift). */
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
  imports: [DatePipe, FormsModule, SelectModule, DatePickerModule, WizardShellComponent],
  template: `
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps"
      [currentIndex]="step()"
      [visited]="visited()"
      [continueDisabled]="!paso1Valido()"
      finishLabel="Generar"
      [finishDisabled]="!preview().length"
      [finishLoading]="generating()"
      (next)="next()"
      (back)="back()"
      (cancel)="cancelar()"
      (finish)="generar()">

      @if (step() === 0) {
        <div class="step">
          <p class="muted">Elegí la obra social y el período a liquidar.</p>

          <div class="form-field">
            <label for="os">Obra Social <span class="pat-form__req" aria-hidden="true">*</span></label>
            <p-select
              inputId="os"
              [options]="insurers()"
              optionLabel="name"
              [filter]="true"
              appendTo="body"
              [(ngModel)]="os"
              (onChange)="onOsChange()"
              data-testid="sel-os" />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="from">Desde <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker
                inputId="from"
                dateFormat="dd/mm/yy"
                appendTo="body"
                [ngModel]="from()"
                (ngModelChange)="from.set($event)"
                data-testid="inp-from" />
            </div>
            <div class="form-field">
              <label for="to">Hasta <span class="pat-form__req" aria-hidden="true">*</span></label>
              <p-datePicker
                inputId="to"
                dateFormat="dd/mm/yy"
                appendTo="body"
                [ngModel]="to()"
                (ngModelChange)="to.set($event)"
                data-testid="inp-to" />
            </div>
          </div>

          @if (rangoInvalido()) {
            <small class="field-error">La fecha "Desde" no puede ser posterior a "Hasta".</small>
          }
        </div>
      } @else {
        <div class="step">
          <p class="muted">Revisá la obra social y el período antes de generar.</p>

          <div class="liq-review">
            <span class="liq-review__os">{{ os()?.name }}</span>
            <span class="liq-review__period">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span>
          </div>

          @if (preview().length) {
            <div class="liq-preview liq-preview--ok">
              <i class="pi pi-check-circle"></i>
              <span><b>{{ preview().length }}</b> {{ preview().length === 1 ? 'prestación' : 'prestaciones' }} pendiente{{ preview().length === 1 ? '' : 's' }} para liquidar.</span>
            </div>
          } @else {
            <div class="liq-preview liq-preview--empty">
              <i class="pi pi-info-circle"></i>
              <span>No hay prestaciones pendientes para esa obra social y período. No se puede generar la liquidación.</span>
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
    .form-field p-select, .form-field p-datepicker { display: block; width: 100%; }
    .form-row { display: flex; gap: 14px; }
    .form-row .form-field { flex: 1; min-width: 0; }
    :host ::ng-deep .form-field .p-datepicker { width: 100%; }
    :host ::ng-deep .form-field .p-datepicker .p-inputtext { width: 100%; }
    :host ::ng-deep .form-field .p-select { width: 100%; }
    .field-error { color: #d83a3a; font-size: 12.5px; }
    .liq-review { display: flex; flex-direction: column; gap: 2px; }
    .liq-review__os { font-weight: 600; font-size: 15px; }
    .liq-review__period { font-size: 13px; color: #64748b; }
    .liq-preview { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 9px; font-size: 13.5px; }
    .liq-preview--ok { background: #e3f6ec; color: #0f6b44; }
    .liq-preview--empty { background: #fcf1dd; color: #b5740c; }
  `],
})
export class GenerarLiquidacionPage implements OnInit {
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

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly pending = this.store.selectSignal(selectLiqPending);
  protected readonly planIds = this.store.selectSignal(selectLiqInsurerPlanIds);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f.getTime() > t.getTime();
  });

  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido());

  /** Preview: pendientes de la OS elegida (por planId) dentro del período. */
  protected readonly preview = computed(() => {
    const ids = new Set(this.planIds());
    const f = toIso(this.from()); const t = toIso(this.to());
    if (!ids.size || !f || !t) return [];
    return this.pending().filter(p =>
      ids.has(p.planId) && p.serviceDate >= f && p.serviceDate <= t);
  });

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.store.dispatch(loadPendingServices());

    // Al generarse con éxito, navegar al detalle de la nueva liquidación.
    this.actions$.pipe(ofType(generateSettlementSuccess), takeUntilDestroyed(this.destroy)).subscribe(({ settlement }) => {
      this.router.navigate(['/financiero/liquidaciones', settlement.id]);
    });
  }

  protected onOsChange(): void {
    const insurer = this.os();
    if (insurer) this.store.dispatch(loadInsurerPlans({ insurerId: insurer.id }));
  }

  protected next(): void {
    if (!this.paso1Valido()) return;
    this.step.set(1);
    this.visited.update(s => new Set(s).add(1));
  }

  protected back(): void {
    this.step.set(0);
  }

  protected generar(): void {
    const insurer = this.os();
    if (!insurer || !this.preview().length) return;
    this.store.dispatch(generateSettlement({
      body: {
        insurerId: insurer.id,
        period: { from: toIso(this.from()), to: toIso(this.to()) },
        specialRules: [],
        excludedAnalysisIdsByPs: null,
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
