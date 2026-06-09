import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { race, take } from 'rxjs';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';
import { AttentionState, isTerminal } from '../../../models/atencion.model';
import { attentionStateLabel, attentionStateSeverity } from '../../../models/atencion-state-label';
import {
  atencionMutationFailure,
  atencionMutationSuccess,
  cancelAtencion,
  createPreFilledAtencion,
  downloadProtocolLabels,
  loadAtencion,
  resetAtencionWizard,
  returnPhase,
} from '../../../store/atencion/atencion.actions';
import {
  selectDetail, selectDetailLoading, selectMutating,
} from '../../../store/atencion/atencion.selectors';
import {
  clearAtencionSession, readAtencionSession, writeAtencionSession,
} from '../../../utils/atencion-session-store';
import { DatosGeneralesStepComponent } from './steps/datos-generales-step/datos-generales-step.component';
import { AnalisisStepComponent } from './steps/analisis-step/analisis-step.component';
import { ResumenStepComponent } from './steps/resumen-step/resumen-step.component';
import { CancelAttentionModalComponent } from '../../../components/cancel-attention-modal/cancel-attention-modal.component';

type StepKey = 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';
interface WizardStepDef {
  key: StepKey;
  label: string;
  requires?: ModuleKey;
  matchesStates: AttentionState[];
}

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
  imports: [
    ButtonModule, TagModule, EmptyStateComponent, FormStepperHeaderComponent,
    DatosGeneralesStepComponent, AnalisisStepComponent, ResumenStepComponent,
    CancelAttentionModalComponent,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      @if (loading() && !detail()) {
        <!-- Solo en la carga INICIAL (sin detail). Durante un refresh con detail ya
             cargado NO se gatea: si no, loadAtencion() del resumen-step (ngOnInit)
             desmonta el step → al re-montar re-dispatcha loadAtencion → loop infinito
             que deja la pantalla colgada en "Cargando atención…". -->
        <div class="text-center py-12 opacity-70">Cargando atención…</div>
      } @else if (creating()) {
        <!-- Modo "crear nueva atención" — sin detail todavía, solo el paso 1 -->
        <header class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold">Nueva atención</h2>
            <div class="text-sm opacity-70">Buscá el paciente para empezar</div>
          </div>
        </header>
        <lab-datos-generales-step [atencionId]="null" [initialDni]="dni() ?? null" />
      } @else if (mutating() && !detail()) {
        <!-- Caso: createPreFilledAtencion en vuelo (?appointmentId=X). Mientras la
             creación va, detail() es null pero mutating() es true. Mostramos un
             estado neutro de "Creando…" en lugar del empty-state engañoso. -->
        <div class="text-center py-12 opacity-70">Creando atención…</div>
      } @else if (!detail()) {
        <ui-empty-state heading="Atención no encontrada" icon="pi-exclamation-circle" />
      } @else {
        <header class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold">Atención {{ detail()!.attentionNumber }}</h2>
            <div class="text-sm opacity-70 flex items-center gap-2">
              <span>Paciente {{ detail()!.patientId ?? '—' }} ·</span>
              <p-tag [value]="stateLabel(detail()!.attentionState)" [severity]="stateSeverity(detail()!.attentionState)" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            @if (canCancel()) {
              <p-button label="Cancelar atención" severity="danger" [text]="true" (onClick)="onCancel()" />
            }
          </div>
        </header>

        @if (isTerminal(detail()!.attentionState)) {
          <ui-empty-state [heading]="terminalHeading()" icon="pi-check-circle" [description]="terminalDescription()" />
        } @else if (isPostSecretary()) {
          <ui-empty-state heading="Fase de secretaría completada" icon="pi-clock"
                          [description]="postSecretaryDescription()" />
          @if (detail()!.protocolId != null) {
            <div class="flex justify-center mt-4">
              <p-button label="Descargar rótulos" icon="pi pi-tag" severity="secondary"
                        (onClick)="downloadLabels()" />
            </div>
          }
        } @else {
          <div class="mb-6 rounded-lg border border-surface-200 overflow-hidden">
            <ui-form-stepper-header
              [steps]="stepperSteps()"
              [currentIndex]="activeIndex()"
              [visited]="completedSteps()"
              [clickable]="false" />
          </div>

          @switch (uiStep()?.key) {
            @case ('datos') {
              <lab-datos-generales-step [atencionId]="detail()!.id" [initialDni]="dni() ?? null"
                                        [initialIndications]="detail()!.indications"
                                        [initialDoctorId]="detail()!.doctorId"
                                        [canReturn]="canReturn()" [returnDisabled]="mutating()"
                                        (returnPhase)="onReturnPhase()" />
            }
            @case ('analisis') {
              <lab-analisis-step [atencionId]="detail()!.id" [canReturn]="canReturn()" [returnDisabled]="mutating()"
                                 (returnPhase)="onReturnPhase()" (stepAdvanced)="onAnalysisAdvanced()" />
            }
            @case ('confirmar') {
              <lab-resumen-step [atencion]="detail()!" [canReturn]="canReturn()" [returnDisabled]="mutating()"
                                (returnPhase)="onReturnPhase()" (finished)="onFinished()" />
            }
          }
        }
      }
    </div>

    <lab-cancel-attention-modal [visible]="cancelModalOpen()"
      (confirmed)="onCancelConfirmed($event)" (dismissed)="cancelModalOpen.set(false)" />
  `,
})
export class AtencionWizardComponent {
  private readonly store      = inject(Store);
  private readonly router     = inject(Router);
  private readonly registry   = inject(ModuleRegistry);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  readonly id            = input<string | undefined>(undefined);
  readonly appointmentId = input<string | undefined>(undefined);
  readonly dni           = input<string | undefined>(undefined);
  readonly queueEntryId  = input<string | undefined>(undefined);

  /**
   * "creating" = estamos en la ruta /atencion/nueva y todavía no se creó la atención.
   * El template renderiza solo el paso de datos generales sin requerir detail().
   * En cuanto el usuario complete el paso 1, createBlank dispatcha y el effect del
   * store navega a /atencion/{newId}, dejando el modo "creating" automáticamente.
   */
  protected readonly creating = computed(() => {
    if (this.id() != null || this.appointmentId() != null) return false;
    const path = (this.router.url ?? '').split('?')[0];
    return path.endsWith('/atencion/nueva');
  });

  protected readonly detail   = this.store.selectSignal(selectDetail);
  protected readonly loading  = this.store.selectSignal(selectDetailLoading);
  protected readonly mutating = this.store.selectSignal(selectMutating);
  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;
  protected readonly isTerminal    = isTerminal;

  protected readonly cancelModalOpen = signal(false);
  protected canCancel(): boolean {
    const s = this.detail()?.attentionState;
    return s != null && !isTerminal(s) && !this.isPostSecretary();
  }

  protected readonly visibleSteps = computed<WizardStepDef[]>(() =>
    ALL_STEPS.filter((s) => !s.requires || this.registry.isActive(s.requires))
  );
  protected readonly stepFromState = computed<WizardStepDef | null>(() => {
    const d = this.detail();
    if (!d) return null;
    return this.visibleSteps().find((s) => s.matchesStates.includes(d.attentionState)) ?? null;
  });
  private readonly uiStepOverride = signal<StepKey | null>(null);
  protected readonly uiStep = computed<WizardStepDef | null>(() => {
    const o = this.uiStepOverride();
    return o ? this.visibleSteps().find((s) => s.key === o) ?? this.stepFromState() : this.stepFromState();
  });
  protected readonly activeIndex = computed(() => {
    const a = this.uiStep();
    return a ? this.visibleSteps().findIndex((s) => s.key === a.key) : -1;
  });

  /** Pasos para el header compartido (solo lectura: dirigido por la máquina de estados). */
  protected readonly stepperSteps = computed<FormStep[]>(() =>
    this.visibleSteps().map((s) => ({ key: s.key, title: s.label }))
  );
  /** Índices completados = los anteriores al paso real del backend (no al uiStep override). */
  protected readonly completedSteps = computed<ReadonlySet<number>>(() => {
    const a = this.stepFromState();
    if (!a) return new Set<number>();
    const activeIdx = this.visibleSteps().findIndex((s) => s.key === a.key);
    const set = new Set<number>();
    for (let i = 0; i < activeIdx; i++) set.add(i);
    return set;
  });

  constructor() {
    effect(() => {
      const idv = this.id();
      const apptId = this.appointmentId();
      this.uiStepOverride.set(null);
      if (idv) {
        this.store.dispatch(loadAtencion({ id: Number(idv) }));
        writeAtencionSession({ atencionId: Number(idv), uiStep: 'datos' });
      } else if (apptId) {
        const qid = this.queueEntryId();
        const queueEntryId = qid ? Number(qid) : null;
        this.store.dispatch(createPreFilledAtencion({
          payload: { appointmentId: Number(apptId), attentionNumber: `A-${Date.now().toString().slice(-6)}`, queueEntryId },
        }));
      } else if (this.creating()) {
        // Modo crear nueva: el step de datos arranca en blanco sin loadAtencion.
        // El DNI inicial llega vía query param `?dni=` (input `dni`), manejado por el template.
      } else {
        const restored = readAtencionSession();
        if (restored && restored.atencionId > 0) {
          this.store.dispatch(loadAtencion({ id: restored.atencionId }));
        }
      }
    });
  }

  canReturn(): boolean {
    const s = this.detail()?.attentionState;
    return s != null && s !== AttentionState.REGISTERING_GENERAL_DATA && !isTerminal(s);
  }
  onReturnPhase(): void {
    const d = this.detail();
    if (!d) return;
    // Si mostramos un paso "adelantado" sólo por UI (override), volver al paso
    // real del backend SIN retroceder de estado.
    if (this.uiStepOverride() != null) {
      this.uiStepOverride.set(null);
      return;
    }
    // Estamos en el paso real → retroceder de verdad en el backend.
    this.store.dispatch(returnPhase({ id: d.id }));
  }
  onCancel(): void {
    if (!this.detail()) return;
    this.cancelModalOpen.set(true);
  }
  onCancelConfirmed(reason: string): void {
    const d = this.detail();
    if (!d) return;
    this.cancelModalOpen.set(false);
    this.store.dispatch(cancelAtencion({ id: d.id, payload: { cancellationReason: reason } }));
    this.waitForMutation((ok) => {
      if (ok) {
        clearAtencionSession();
        this.store.dispatch(resetAtencionWizard());
        this.router.navigate(['/turnos/recepcion']);
      }
    });
  }

  private waitForMutation(cb: (ok: boolean) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type));
  }
  onAnalysisAdvanced(): void {
    const steps = this.visibleSteps();
    const idx = steps.findIndex((s) => s.key === 'analisis');
    const next = steps[idx + 1]?.key;
    if (next) this.uiStepOverride.set(next);
  }
  onFinished(): void {
    clearAtencionSession();
    this.store.dispatch(resetAtencionWizard());
    this.router.navigate(['/turnos/recepcion']);
  }
  downloadLabels(): void {
    const d = this.detail();
    if (!d || d.protocolId == null) return;
    this.store.dispatch(downloadProtocolLabels({ protocolId: d.protocolId, protocolNumber: `P-${d.protocolId}` }));
  }

  isPostSecretary(): boolean {
    const s = this.detail()?.attentionState;
    return s === AttentionState.AWAITING_EXTRACTION || s === AttentionState.IN_EXTRACTION;
  }
  postSecretaryDescription(): string {
    return this.detail()?.attentionState === AttentionState.AWAITING_EXTRACTION
      ? 'La atención está en la cola de extracción esperando que un extractor la tome.'
      : 'Un extractor está atendiendo a este paciente en este momento.';
  }
  terminalHeading(): string {
    const s = this.detail()?.attentionState;
    if (s === AttentionState.FINISHED) return 'Atención finalizada';
    if (s === AttentionState.CANCELED) return 'Atención cancelada';
    return 'Atención fallida';
  }
  terminalDescription(): string {
    const d = this.detail();
    if (d?.attentionState === AttentionState.CANCELED && d.cancellationReason) return `Motivo: ${d.cancellationReason}`;
    return 'Esta atención está en un estado terminal.';
  }
}
