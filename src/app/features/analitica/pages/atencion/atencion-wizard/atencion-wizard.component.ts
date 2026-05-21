import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { AttentionState, isTerminal } from '../../../models/atencion.model';
import {
  attentionStateLabel,
  attentionStateSeverity,
} from '../../../models/atencion-state-label';
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
import {
  selectDetail,
  selectDetailLoading,
  selectMutating,
} from '../../../store/atencion/atencion.selectors';

type StepKey = 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';

interface WizardStepDef {
  key: StepKey;
  label: string;
  requires?: ModuleKey;
  matchesStates: AttentionState[];
}

/**
 * Catálogo de pasos del wizard. Cada paso declara:
 * - requires?: el paso se filtra si el módulo no está activo en el tenant
 * - matchesStates: qué estados del backend corresponden a este paso
 *
 * Para tenants sin Financiero, `cobro` y `facturacion` se filtran y el wizard
 * queda con 3 pasos. El backend se ocupa del salto de estado al recibir
 * end-secretary-phase desde REGISTERING_ANALYSES.
 */
const ALL_STEPS: WizardStepDef[] = [
  { key: 'datos',       label: 'Datos generales', matchesStates: [AttentionState.REGISTERING_GENERAL_DATA] },
  { key: 'analisis',    label: 'Análisis',        matchesStates: [AttentionState.REGISTERING_ANALYSES] },
  { key: 'cobro',       label: 'Cobro',           requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_COLLECTION_PROCESS] },
  { key: 'facturacion', label: 'Facturación',     requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_BILLING_PROCESS] },
  { key: 'confirmar',   label: 'Confirmar',       matchesStates: [AttentionState.AWAITING_CONFIRMATION] },
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
            <div class="text-sm text-[var(--ds-text-muted)] flex items-center gap-2">
              <span>Paciente {{ detail()!.patientId ?? '—' }} ·</span>
              <p-tag [value]="stateLabel(detail()!.attentionState)"
                     [severity]="stateSeverity(detail()!.attentionState)" />
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
        } @else if (isPostSecretaryState()) {
          <div class="bg-white rounded-lg shadow-sm p-6">
            <ui-empty-state
              heading="Fase de secretaría completada"
              icon="pi-clock"
              [description]="postSecretaryDescription()" />
          </div>
        } @else {
          <div class="flex items-center mb-6 px-2">
            @for (step of visibleSteps(); track step.key; let i = $index, last = $last) {
              <button type="button"
                      class="flex flex-col items-center text-xs flex-1 transition-opacity bg-transparent border-0"
                      [class.cursor-pointer]="isReachable(step)"
                      [class.opacity-50]="!isReachable(step) && !isActive(step)"
                      [disabled]="!isReachable(step) && !isActive(step)"
                      (click)="goToStep(step)">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-white"
                     [style.background]="dotColor(step)">
                  @if (isCompletedByState(step)) { ✓ } @else { {{ i + 1 }} }
                </div>
                <div class="mt-1">{{ step.label }}</div>
              </button>
              @if (!last) {
                <div class="h-px flex-[0.5] mx-1"
                     [style.background]="i < activeIndex() ? '#10b981' : '#cbd5e1'"></div>
              }
            }
          </div>

          <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
            @switch (uiStep()?.key) {
              @case ('datos') {
                <div class="space-y-3">
                  <h3 class="font-semibold mb-2">Datos generales</h3>
                  @if (detail()!.patientId == null) {
                    <div class="text-sm text-[var(--color-danger,#ef4444)] mb-2">
                      ⚠ Esta atención no tiene paciente asignado. No se puede avanzar hasta que se complete desde el módulo de turnos.
                    </div>
                  }
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
                  @if (!financieroActive()) {
                    <p class="text-xs text-[var(--ds-text-muted)]">
                      El módulo Financiero no está activo en este laboratorio. Al continuar, la atención
                      pasa directamente a la cola de extracción (saltando cobro y facturación).
                    </p>
                  }
                </div>
              }
              @case ('cobro') {
                <div class="space-y-3">
                  <h3 class="font-semibold mb-2">Cobro al paciente</h3>
                  <label class="block text-sm">ID del pago
                    <input pInputText type="number" [(ngModel)]="form.paymentId" class="w-full" />
                  </label>
                  <p class="text-xs text-[var(--ds-text-muted)]">
                    Al continuar se registra el pago y se cierra la fase de cobro automáticamente.
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
                        [disabled]="mutating() || !canReturnPhase()" (onClick)="returnPhase()" />
              <p-button label="Observaciones" severity="secondary" [text]="true"
                        (onClick)="showObservations = true" />
            </div>
            <div class="flex gap-2">
              <p-button label="Cancelar atención" severity="danger" [text]="true"
                        (onClick)="showCancel = true" />
              <p-button [label]="continueLabel()"
                        [disabled]="mutating() || !canContinue()"
                        (onClick)="continueStep()" />
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
export class AtencionWizardComponent {
  private readonly store    = inject(Store);
  private readonly router   = inject(Router);
  private readonly registry = inject(ModuleRegistry);

  // Inputs bindeados desde la ruta (withComponentInputBinding) — reaccionan a cambios de params
  readonly id            = input<string | undefined>(undefined);
  readonly appointmentId = input<string | undefined>(undefined);

  protected readonly detail   = this.store.selectSignal(selectDetail);
  protected readonly loading  = this.store.selectSignal(selectDetailLoading);
  protected readonly mutating = this.store.selectSignal(selectMutating);

  protected readonly isTerminal    = isTerminal;
  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;

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

  protected readonly financieroActive = computed(() => this.registry.isActive(ModuleKey.Financiero));

  protected readonly visibleSteps = computed<WizardStepDef[]>(() =>
    ALL_STEPS.filter(s => !s.requires || this.registry.isActive(s.requires))
  );

  /** Step derivado del estado del backend (el mínimo en el que está la atención). */
  protected readonly stepFromState = computed<WizardStepDef | null>(() => {
    const d = this.detail();
    if (!d) return null;
    return this.visibleSteps().find(s => s.matchesStates.includes(d.attentionState)) ?? null;
  });

  /**
   * Override local del paso visible. Se setea cuando el usuario adelanta UI mientras
   * el backend todavía no cambió de estado (caso cobro: add-payment + end-collection
   * en cadena), o cuando se navega libremente a un paso ya completado.
   */
  private readonly uiStepOverride = signal<StepKey | null>(null);

  protected readonly uiStep = computed<WizardStepDef | null>(() => {
    const override = this.uiStepOverride();
    if (override) {
      return this.visibleSteps().find(s => s.key === override) ?? this.stepFromState();
    }
    return this.stepFromState();
  });

  protected readonly activeIndex = computed(() => {
    const a = this.uiStep();
    return a ? this.visibleSteps().findIndex(s => s.key === a.key) : -1;
  });

  constructor() {
    // Reacciona a cambios de :id en la URL (reemplaza el uso de ActivatedRoute.snapshot del FE-5)
    effect(() => {
      const idValue = this.id();
      const apptId  = this.appointmentId();
      this.uiStepOverride.set(null);
      if (idValue) {
        this.store.dispatch(loadAtencion({ id: Number(idValue) }));
      } else if (apptId) {
        this.store.dispatch(createPreFilledAtencion({
          payload: {
            appointmentId: Number(apptId),
            attentionNumber: `A-${Date.now().toString().slice(-6)}`,
          },
        }));
      }
    });
  }

  // ---- Computed UI helpers ------------------------------------------------

  protected isCompletedByState(step: WizardStepDef): boolean {
    const a = this.stepFromState();
    if (!a) return false;
    const stateIdx = this.visibleSteps().findIndex(s => s.key === a.key);
    const stepIdx  = this.visibleSteps().findIndex(s => s.key === step.key);
    return stepIdx < stateIdx;
  }

  protected isActive(step: WizardStepDef): boolean {
    return this.uiStep()?.key === step.key;
  }

  /** Permite click en cualquier paso ya visitado por el backend o el actual. */
  protected isReachable(step: WizardStepDef): boolean {
    return this.isCompletedByState(step) || this.isActive(step);
  }

  protected goToStep(step: WizardStepDef): void {
    if (!this.isReachable(step)) return;
    this.uiStepOverride.set(step.key);
  }

  protected dotColor(step: WizardStepDef): string {
    if (this.isCompletedByState(step)) return '#10b981';
    if (this.isActive(step))           return 'var(--brand-secondary, #3b82f6)';
    return '#94a3b8';
  }

  protected continueLabel(): string {
    const k = this.uiStep()?.key;
    if (k === 'analisis' && !this.financieroActive()) return 'Finalizar fase';
    if (k === 'confirmar') return 'Finalizar fase';
    return 'Continuar';
  }

  protected canContinue(): boolean {
    const k = this.uiStep()?.key;
    if (k === 'datos' && this.detail()?.patientId == null) return false;
    return true;
  }

  protected canReturnPhase(): boolean {
    const state = this.detail()?.attentionState;
    return state != null
        && state !== AttentionState.REGISTERING_GENERAL_DATA
        && !isTerminal(state);
  }

  // ---- Continuar — dispara la acción correcta según el step y Financiero ---

  protected continueStep(): void {
    const d = this.detail();
    const step = this.uiStep();
    if (!d || !step) return;

    switch (step.key) {
      case 'datos': {
        // FE-6: guard duro contra patientId null — no mandamos un 0 placeholder al backend.
        if (d.patientId == null) return;
        this.store.dispatch(assignGeneralData({
          id: d.id,
          payload: {
            patientId: d.patientId,
            doctorId: this.form.doctorId,
            insurancePlanId: this.form.insurancePlanId,
            indications: this.form.indications || null,
          },
        }));
        return;
      }

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
        // FE-7: con Financiero OFF el backend (PR coordinado) acepta end-secretary-phase
        // directo desde REGISTERING_ANALYSES y salta cobro+facturación. Con ON, adelantamos
        // el uiStep a cobro para que el usuario pueda ingresar el paymentId aunque el estado
        // del backend siga en REGISTERING_ANALYSES (add-payment es el que avanza).
        if (!this.financieroActive()) {
          this.store.dispatch(endSecretaryPhase({ id: d.id }));
        } else {
          this.uiStepOverride.set('cobro');
        }
        return;
      }

      case 'cobro': {
        if (this.form.paymentId == null) return;
        // FE-8: add-payment lleva el estado a ON_COLLECTION_PROCESS y luego end-collection
        // lo lleva a ON_BILLING_PROCESS. Encadenamos las dos para que un solo click cierre
        // la fase de cobro. El uiStep adelantado garantiza que la UI muestre facturación
        // cuando el detail refresque.
        this.store.dispatch(addPayment({ id: d.id, payload: { paymentId: this.form.paymentId } }));
        this.store.dispatch(endCollection({ id: d.id }));
        this.uiStepOverride.set('facturacion');
        return;
      }

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
    this.uiStepOverride.set(null);
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

  // ---- Empty-state helpers ------------------------------------------------

  /** AWAITING_EXTRACTION e IN_EXTRACTION son no-terminales pero ningún step los matchea (FE-4). */
  protected isPostSecretaryState(): boolean {
    const s = this.detail()?.attentionState;
    return s === AttentionState.AWAITING_EXTRACTION || s === AttentionState.IN_EXTRACTION;
  }

  protected postSecretaryDescription(): string {
    const s = this.detail()?.attentionState;
    if (s === AttentionState.AWAITING_EXTRACTION) {
      return 'La atención está en la cola de extracción esperando que un extractor la tome.';
    }
    return 'Un extractor está atendiendo a este paciente en este momento.';
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
