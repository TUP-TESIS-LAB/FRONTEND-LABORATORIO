import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { AttentionResponse, AttentionState, isTerminal } from '../../../models/atencion.model';
import {
  addAnalysisList,
  addObservations,
  addPayment,
  assignGeneralData,
  cancelAtencion,
  createPreFilledAtencion,
  endBilling,
  endCollection,
  endSecretaryPhase,
  loadAtencion,
  returnPhase,
} from '../../../store/atencion/atencion.actions';
import { selectDetail, selectDetailLoading, selectMutating } from '../../../store/atencion/atencion.selectors';

interface WizardStepDef {
  key: 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';
  label: string;
  requires?: ModuleKey;
  matchesStates: AttentionState[];
}

const ALL_STEPS: WizardStepDef[] = [
  { key: 'datos',       label: 'Datos generales', matchesStates: [AttentionState.REGISTERING_GENERAL_DATA] },
  { key: 'analisis',    label: 'Análisis',         matchesStates: [AttentionState.REGISTERING_ANALYSES] },
  { key: 'cobro',       label: 'Cobro',            requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_COLLECTION_PROCESS] },
  { key: 'facturacion', label: 'Facturación',      requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_BILLING_PROCESS] },
  { key: 'confirmar',   label: 'Confirmar',        matchesStates: [AttentionState.AWAITING_CONFIRMATION] },
];

@Component({
  selector: 'lab-atencion-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, TagModule, DialogModule, EmptyStateComponent],
  template: `
    <div class="p-6">
      @if (loading()) {
        <div class="text-center py-12 text-[var(--ds-text-muted)]">Cargando atención…</div>
      } @else if (!detail()) {
        <ui-empty-state heading="Atención no encontrada" icon="pi-exclamation-circle" />
      } @else {
        <header class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold">Atención {{ detail()!.attentionNumber }}</h2>
            <div class="text-sm text-[var(--ds-text-muted)]">
              Paciente {{ detail()!.patientId ?? '—' }} ·
              <p-tag [value]="detail()!.attentionState" />
            </div>
          </div>
          <p-button label="Volver al listado" severity="secondary" [text]="true" (onClick)="back()" />
        </header>

        @if (isTerminal(detail()!.attentionState)) {
          <div class="bg-white rounded-lg shadow-sm p-6">
            <ui-empty-state
              [heading]="terminalHeading()"
              icon="pi-check-circle"
              [description]="terminalDescription()" />
          </div>
        } @else {
          <!-- Stepper visual (horizontal) -->
          <div class="flex items-center mb-6 px-2">
            @for (step of visibleSteps(); track step.key; let i = $index, last = $last) {
              <div class="flex flex-col items-center text-xs flex-1"
                   [class.opacity-50]="!isCompleted(step) && !isActive(step)">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-white"
                     [style.background]="dotColor(step)">
                  @if (isCompleted(step)) { ✓ } @else { {{ i + 1 }} }
                </div>
                <div class="mt-1">{{ step.label }}</div>
              </div>
              @if (!last) {
                <div class="h-px flex-[0.5] mx-1"
                     [style.background]="i < activeIndex() ? '#10b981' : '#cbd5e1'"></div>
              }
            }
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            @switch (activeStep()?.key) {
              @case ('datos') {
                <div class="space-y-3">
                  <h3 class="font-semibold mb-2">Datos generales</h3>
                  <label class="block text-sm">Médico (ID)
                    <input pInputText type="number" [(ngModel)]="form.doctorId" class="w-full" />
                  </label>
                  <label class="block text-sm">Obra social — plan (ID)
                    <input pInputText type="number" [(ngModel)]="form.insurancePlanId" class="w-full" />
                  </label>
                  <label class="block text-sm">Indicaciones
                    <input pInputText [(ngModel)]="form.indications" class="w-full" />
                  </label>
                </div>
              }
              @case ('analisis') {
                <div class="space-y-3">
                  <h3 class="font-semibold mb-2">Análisis</h3>
                  <label class="block text-sm">IDs de análisis (separados por coma)
                    <input pInputText [(ngModel)]="form.analysisIdsRaw" class="w-full" />
                  </label>
                  <label class="block text-sm">Nº autorización
                    <input pInputText type="number" [(ngModel)]="form.authorizationNumber" class="w-full" />
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" [(ngModel)]="form.isUrgent" /> Urgente
                  </label>
                </div>
              }
              @case ('cobro') {
                <div class="space-y-3">
                  <h3 class="font-semibold mb-2">Cobro al paciente</h3>
                  <label class="block text-sm">ID del pago
                    <input pInputText type="number" [(ngModel)]="form.paymentId" class="w-full" />
                  </label>
                  <p class="text-xs text-[var(--ds-text-muted)]">
                    Tras registrar el pago el wizard avanza a Facturación.
                  </p>
                </div>
              }
              @case ('facturacion') {
                <div>
                  <h3 class="font-semibold mb-2">Facturación / autorización de cobertura</h3>
                  <p class="text-sm text-[var(--ds-text-muted)]">
                    La integración con el módulo Financiero genera el protocolo al confirmar este paso.
                  </p>
                </div>
              }
              @case ('confirmar') {
                <div>
                  <h3 class="font-semibold mb-2">Confirmar fin de la fase de secretaría</h3>
                  <p class="text-sm text-[var(--ds-text-muted)]">
                    Al confirmar la atención pasa a la cola de extracción.
                  </p>
                </div>
              }
            }
          </div>

          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <p-button label="Volver fase" severity="secondary" [outlined]="true"
                        [disabled]="mutating()" (onClick)="returnPhase()" />
              <p-button label="Observaciones" severity="secondary" [text]="true"
                        (onClick)="showObservations = true" />
            </div>
            <div class="flex gap-2">
              <p-button label="Cancelar atención" severity="danger" [text]="true"
                        (onClick)="showCancel = true" />
              <p-button [label]="continueLabel()" [disabled]="mutating()" (onClick)="continueStep()" />
            </div>
          </div>

          <p-dialog header="Cancelar atención" [(visible)]="showCancel" [modal]="true" [style]="{ width: '420px' }">
            <label class="block text-sm">Motivo de cancelación
              <input pInputText [(ngModel)]="cancelReason" class="w-full" />
            </label>
            <div class="flex justify-end gap-2 mt-4">
              <p-button label="Volver" severity="secondary" [text]="true" (onClick)="showCancel = false" />
              <p-button label="Confirmar cancelación" severity="danger"
                        [disabled]="!cancelReason.trim() || mutating()" (onClick)="doCancel()" />
            </div>
          </p-dialog>

          <p-dialog header="Observaciones" [(visible)]="showObservations" [modal]="true" [style]="{ width: '420px' }">
            <label class="block text-sm">Observaciones
              <input pInputText [(ngModel)]="observationsText" class="w-full" />
            </label>
            <div class="flex justify-end gap-2 mt-4">
              <p-button label="Cerrar" severity="secondary" [text]="true" (onClick)="showObservations = false" />
              <p-button label="Guardar" [disabled]="!observationsText.trim() || mutating()" (onClick)="saveObservations()" />
            </div>
          </p-dialog>
        }
      }
    </div>
  `,
})
export class AtencionWizardComponent implements OnInit {
  private readonly store    = inject(Store);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);
  private readonly registry = inject(ModuleRegistry);

  readonly id            = input<string | undefined>(undefined);
  readonly appointmentId = input<string | undefined>(undefined);

  protected readonly detail   = this.store.selectSignal(selectDetail);
  protected readonly loading  = this.store.selectSignal(selectDetailLoading);
  protected readonly mutating = this.store.selectSignal(selectMutating);

  protected readonly isTerminal = isTerminal;

  protected showCancel       = false;
  protected showObservations = false;
  protected cancelReason     = '';
  protected observationsText = '';

  protected form: {
    doctorId: number | null;
    insurancePlanId: number | null;
    indications: string;
    analysisIdsRaw: string;
    authorizationNumber: number | null;
    isUrgent: boolean;
    paymentId: number | null;
  } = {
    doctorId: null, insurancePlanId: null, indications: '',
    analysisIdsRaw: '', authorizationNumber: null, isUrgent: false,
    paymentId: null,
  };

  protected readonly visibleSteps = computed(() =>
    ALL_STEPS.filter(s => !s.requires || this.registry.isActive(s.requires))
  );

  protected readonly activeStep = computed<WizardStepDef | null>(() => {
    const d = this.detail();
    if (!d) return null;
    return this.visibleSteps().find(s => s.matchesStates.includes(d.attentionState)) ?? null;
  });

  protected readonly activeIndex = computed(() => {
    const a = this.activeStep();
    return a ? this.visibleSteps().findIndex(s => s.key === a.key) : -1;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const apptId  = this.route.snapshot.queryParamMap.get('appointmentId');

    if (idParam) {
      this.store.dispatch(loadAtencion({ id: Number(idParam) }));
      return;
    }
    if (apptId) {
      this.store.dispatch(createPreFilledAtencion({
        payload: {
          appointmentId: Number(apptId),
          attentionNumber: `A-${Date.now().toString().slice(-6)}`,
        },
      }));
    }
  }

  protected isCompleted(step: WizardStepDef): boolean {
    return this.visibleSteps().findIndex(s => s.key === step.key) < this.activeIndex();
  }

  protected isActive(step: WizardStepDef): boolean {
    return this.activeStep()?.key === step.key;
  }

  protected dotColor(step: WizardStepDef): string {
    if (this.isCompleted(step)) return '#10b981';
    if (this.isActive(step))    return 'var(--brand-secondary, #3b82f6)';
    return '#94a3b8';
  }

  protected continueLabel(): string {
    const k = this.activeStep()?.key;
    return k === 'confirmar' ? 'Finalizar fase' : 'Continuar';
  }

  protected continueStep(): void {
    const d = this.detail();
    const step = this.activeStep();
    if (!d || !step) return;

    switch (step.key) {
      case 'datos':
        this.store.dispatch(assignGeneralData({
          id: d.id,
          payload: {
            patientId: d.patientId ?? 0,
            doctorId: this.form.doctorId,
            insurancePlanId: this.form.insurancePlanId,
            indications: this.form.indications || null,
          },
        }));
        return;

      case 'analisis': {
        const ids = this.form.analysisIdsRaw
          .split(',')
          .map(x => Number(x.trim()))
          .filter(n => Number.isFinite(n) && n > 0);
        this.store.dispatch(addAnalysisList({
          id: d.id,
          payload: {
            analysisIds: ids,
            isUrgent: this.form.isUrgent,
            authorizationNumber: this.form.authorizationNumber,
          },
        }));
        // If financiero is OFF, the next "Continuar" press will be from the same state
        // (state advances to REGISTERING_ANALYSES first via add-analysis if backend allows).
        return;
      }

      case 'cobro':
        if (this.form.paymentId == null) return;
        this.store.dispatch(addPayment({ id: d.id, payload: { paymentId: this.form.paymentId } }));
        // After addPayment state moves to ON_COLLECTION_PROCESS — auto-advance with endCollection
        // is handled by next "Continuar" click once detail refreshes.
        return;

      case 'facturacion':
        this.store.dispatch(endBilling({ id: d.id }));
        return;

      case 'confirmar':
        this.store.dispatch(endSecretaryPhase({ id: d.id }));
        return;
    }
  }

  protected returnPhase(): void {
    const d = this.detail();
    if (!d) return;
    this.store.dispatch(returnPhase({ id: d.id }));
  }

  protected doCancel(): void {
    const d = this.detail();
    if (!d) return;
    this.store.dispatch(cancelAtencion({ id: d.id, payload: { cancellationReason: this.cancelReason } }));
    this.showCancel = false;
    this.cancelReason = '';
  }

  protected saveObservations(): void {
    const d = this.detail();
    if (!d) return;
    this.store.dispatch(addObservations({ id: d.id, payload: { observations: this.observationsText } }));
    this.showObservations = false;
    this.observationsText = '';
  }

  protected back(): void {
    this.router.navigate(['/analitica/atencion']);
  }

  protected terminalHeading(): string {
    const s = this.detail()?.attentionState;
    if (s === AttentionState.FINISHED) return 'Atención finalizada';
    if (s === AttentionState.CANCELED) return 'Atención cancelada';
    return 'Atención fallida';
  }

  protected terminalDescription(): string {
    const d = this.detail();
    if (!d) return '';
    if (d.attentionState === AttentionState.CANCELED && d.cancellationReason) {
      return `Motivo: ${d.cancellationReason}`;
    }
    return 'Esta atención está en un estado terminal. Solo es posible agregar observaciones.';
  }
}
