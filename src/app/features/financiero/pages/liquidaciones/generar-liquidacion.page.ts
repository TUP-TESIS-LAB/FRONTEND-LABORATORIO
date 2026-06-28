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
  { key: 'datos', title: 'Datos', subtitle: 'Obra social y período', required: true },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones pendientes' },
];

@Component({
  selector: 'fin-generar-liquidacion-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, SelectModule, WizardShellComponent],
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
        <div class="liq-step">
          <label class="liq-field">
            <span>Obra Social <i class="liq-req">*</i></span>
            <p-select [options]="insurers()" optionLabel="name" [filter]="true"
                      placeholder="Elegí una obra social" [(ngModel)]="os"
                      (onChange)="onOsChange()" data-testid="sel-os" />
          </label>
          <div class="liq-row">
            <label class="liq-field">
              <span>Desde <i class="liq-req">*</i></span>
              <input type="date" [ngModel]="from()" (ngModelChange)="from.set($event)" data-testid="inp-from" />
            </label>
            <label class="liq-field">
              <span>Hasta <i class="liq-req">*</i></span>
              <input type="date" [ngModel]="to()" (ngModelChange)="to.set($event)" data-testid="inp-to" />
            </label>
          </div>
          @if (rangoInvalido()) {
            <p class="liq-error">La fecha "Desde" no puede ser posterior a "Hasta".</p>
          }
        </div>
      } @else {
        <div class="liq-step">
          <h3>Revisar antes de generar</h3>
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
    .liq-step { display: flex; flex-direction: column; gap: 14px; }
    .liq-row { display: flex; gap: 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; flex: 1; }
    .liq-field input { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
    .liq-req { color: #d83a3a; font-style: normal; }
    .liq-error { color: #d83a3a; font-size: 12.5px; margin: 0; }
    .liq-review { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
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
  protected readonly from = signal<string>('');
  protected readonly to = signal<string>('');

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly pending = this.store.selectSignal(selectLiqPending);
  protected readonly planIds = this.store.selectSignal(selectLiqInsurerPlanIds);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f > t;
  });

  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido());

  /** Preview: pendientes de la OS elegida (por planId) dentro del período. */
  protected readonly preview = computed(() => {
    const ids = new Set(this.planIds());
    const f = this.from(); const t = this.to();
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
        period: { from: this.from(), to: this.to() },
        specialRules: [],
        excludedAnalysisIdsByPs: null,
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
