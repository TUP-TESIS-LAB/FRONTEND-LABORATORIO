import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, viewChild,
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
import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';
import { AttentionState, isTerminal } from '../../../models/atencion.model';
import { attentionStateLabel } from '../../../models/atencion-state-label';
import {
  addPayment,
  advanceUrgent,
  atencionMutationFailure,
  atencionMutationSuccess,
  cancelAtencion,
  createPreFilledAtencion,
  downloadProtocolLabels,
  endCollection,
  loadAtencion,
  loadAttentionPatient,
  resetAtencionWizard,
  returnPhase,
} from '../../../store/atencion/atencion.actions';
import {
  selectCopaymentMutating, selectDetail, selectDetailLoading, selectMutating, selectPatientResolving,
  selectResolvedPatient,
} from '../../../store/atencion/atencion.selectors';
import {
  clearAtencionSession, readAtencionSession, writeAtencionSession,
} from '../../../utils/atencion-session-store';
import { clearAnalisisDraft } from '../../../utils/analisis-draft-store';
import { DatosGeneralesStepComponent } from './steps/datos-generales-step/datos-generales-step.component';
import { AnalisisStepComponent } from './steps/analisis-step/analisis-step.component';
import { ResumenStepComponent } from './steps/resumen-step/resumen-step.component';
import { CancelAttentionModalComponent } from '../../../components/cancel-attention-modal/cancel-attention-modal.component';
import { CobroStepComponent } from './steps/cobro-step/cobro-step.component';
import { CobroAtencionComponent } from '@features/financiero/components/cobro-atencion/cobro-atencion.component';

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
    ButtonModule, TagModule, EmptyStateComponent, WizardShellComponent,
    DatosGeneralesStepComponent, AnalisisStepComponent, ResumenStepComponent,
    CancelAttentionModalComponent, CobroStepComponent, CobroAtencionComponent,
  ],
  // T8: el wizard ocupa el alto del viewport (menos el topbar) y es una columna flex,
  // así el contenido del paso flexiona y el footer (Volver/Confirmar) queda pegado abajo,
  // sin que la página tenga scroll vertical propio. Sin padding/max-width propios (eso
  // rompía el full-bleed de ui-wizard-shell) — solo establece el alto definido que
  // ui-wizard-shell necesita para su propio truco de margin negativo.
  styles: [`
    :host { display: block; }
    .aw-shell {
      height: calc(100dvh - var(--ds-topbar-h, 64px) - 3rem);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
  `],
  template: `
    <div class="aw-shell">
    @if (loading() && !detail()) {
      <!-- Solo en la carga INICIAL (sin detail). Durante un refresh con detail ya
           cargado NO se gatea: si no, loadAtencion() del resumen-step (ngOnInit)
           desmonta el step → al re-montar re-dispatcha loadAtencion → loop infinito
           que deja la pantalla colgada en "Cargando atención…". -->
      <div class="p-6 max-w-4xl mx-auto w-full text-center py-12 opacity-70">Cargando atención…</div>
    } @else if (creating()) {
      <!-- Modo "crear nueva atención" — sin detail todavía, solo el paso 1. Mismo
           shell que el resto del wizard (U1, KAN-246): antes esto era markup ad-hoc
           sin stepper, así que al crear la atención el usuario "saltaba" de golpe al
           paso 2 sin haber visto nunca el paso 1 resaltado. Con el shell acá, el
           stepper ya arranca marcando "1 Datos generales" activo. -->
      <ui-wizard-shell
        heading="Nueva atención"
        [steps]="stepperSteps()"
        [currentIndex]="0"
        [visited]="emptySet"
        [clickable]="false"
        [customFooter]="true"
        [maxWidth]="'1040px'">

        <div headerActions>
          <p-button label="Volver al listado" severity="secondary" [text]="true"
                    (onClick)="backToList()" />
        </div>

        <lab-datos-generales-step [atencionId]="null" [initialDni]="dni() ?? null" />

        <div wizardFooter>
          <p-button label="Confirmar y seguir" [disabled]="!datosCanConfirm()"
                    (onClick)="advanceCurrent()" />
        </div>
      </ui-wizard-shell>
    } @else if (mutating() && !detail()) {
      <!-- Caso: createPreFilledAtencion en vuelo (?appointmentId=X). Mientras la
           creación va, detail() es null pero mutating() es true. Mostramos un
           estado neutro de "Creando…" en lugar del empty-state engañoso. -->
      <div class="p-6 max-w-4xl mx-auto w-full text-center py-12 opacity-70">Creando atención…</div>
    } @else if (!detail()) {
      <div class="p-6 max-w-4xl mx-auto w-full">
        <ui-empty-state heading="Atención no encontrada" icon="pi-exclamation-circle" />
      </div>
    } @else {
      <!-- Item 1+5: el wizard de atención usa el shell estándar (ui-wizard-shell), sin
           padding/max-width propios encima (el wrapper .aw-shell solo aporta el alto
           fijo del viewport para el footer pegado abajo) — mismo look full-bleed que
           el resto de los wizards del laboratorio (sacar-turno, sucursal, agenda, domicilio).
           URGENTE va inline al lado del título ([headingBadge]); las acciones de
           header (Volver al listado / Cancelar) en [headerActions]; el banner de
           solo-lectura + Descargar rótulos en [wizardBanner]; y los botones de
           navegación de cada paso suben al footer del shell ([wizardFooter]). -->
        <ui-wizard-shell
          [heading]="'Atención ' + headerTitle()"
          [steps]="stepperSteps()"
          [currentIndex]="activeIndex()"
          [visited]="completedSteps()"
          [clickable]="readOnly()"
          [customFooter]="true"
          [maxWidth]="'1040px'"
          (stepSelected)="goToStep($event)">

          @if (detail()!.isUrgent) {
            <p-tag headingBadge value="URGENTE" severity="danger" />
          }

          <div headerActions class="flex items-center gap-2">
            <p-button label="Volver al listado" severity="secondary" [text]="true" size="small"
                      (onClick)="backToList()" />
            @if (canCancel()) {
              <p-button label="Cancelar atención" severity="danger" [text]="true" size="small" (onClick)="onCancel()" />
            }
          </div>

          <!-- KAN-140: badges de pendientes (cobro/autorización/datos) cuando la atención
               fue avanzada en modo express urgente y hay tareas administrativas por completar. -->
          @if (detail()!.cobroPendiente || detail()!.autorizacionPendiente || detail()!.datosAdministrativosIncompletos) {
            <div wizardBanner class="mx-8 mt-4 rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm text-orange-800 flex flex-wrap items-center gap-2">
              <i class="pi pi-exclamation-circle"></i>
              <span class="font-semibold">Pendientes:</span>
              @if (detail()!.cobroPendiente) {
                <span class="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 border border-orange-300">
                  <i class="pi pi-credit-card text-[10px]"></i> Cobro pendiente
                </span>
              }
              @if (detail()!.autorizacionPendiente) {
                <span class="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 border border-orange-300">
                  <i class="pi pi-file-check text-[10px]"></i> Autorización pendiente
                </span>
              }
              @if (detail()!.datosAdministrativosIncompletos) {
                <span class="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 border border-orange-300">
                  <i class="pi pi-user-edit text-[10px]"></i> Datos incompletos
                </span>
              }
            </div>
          }

          @if (readOnly()) {
            <div wizardBanner class="mx-8 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
              <i class="pi pi-eye"></i>
              <span>{{ readOnlyBanner() }}</span>
              <!-- T7: la reimpresión de rótulos SOLO en "esperando extracción".
                   Una atención finalizada/en-extracción NO reimprime. -->
              @if (detail()!.attentionState === AttentionState.AWAITING_EXTRACTION && detail()!.protocolId != null) {
                <p-button class="ml-auto" label="Descargar rótulos" severity="secondary"
                          (onClick)="downloadLabels()" />
              }
            </div>
          }

          <!-- Cuerpo del paso (proyectado al área scrollable del shell). -->
          @switch (uiStep()?.key) {
            @case ('datos') {
              <lab-datos-generales-step [atencionId]="detail()!.id" [initialDni]="dni() ?? null"
                                        [initialPatientId]="detail()!.patientId"
                                        [initialIndications]="detail()!.indications"
                                        [initialDoctorId]="detail()!.doctorId"
                                        [initialInsurancePlanId]="detail()!.insurancePlanId"
                                        [initialIsUrgent]="detail()!.isUrgent"
                                        [readOnly]="readOnly()" />
            }
            @case ('analisis') {
              <lab-analisis-step [atencionId]="detail()!.id" [readOnly]="readOnly()"
                                 (itemsCount)="analysisCount.set($event)"
                                 (stepAdvanced)="onAnalysisAdvanced()" />
            }
            @case ('cobro') {
              <lab-cobro-step [atencion]="detail()!" />
            }
            @case ('facturacion') {
              <fin-cobro-atencion [attentionId]="detail()!.id" />
            }
            @case ('confirmar') {
              <lab-resumen-step [atencion]="detail()!" [readOnly]="readOnly()"
                                (finished)="onFinished()" />
            }
          }

          <!-- Footer del shell: botones según el paso actual + la máquina de estados. -->
          @if (!readOnly()) {
            <div wizardFooter class="flex items-center gap-2">
              @if (canReturn()) {
                <p-button label="Volver fase" severity="secondary" [outlined]="true"
                          [disabled]="mutating()" (onClick)="onReturnPhase()" />
              }
              @switch (uiStep()?.key) {
                @case ('confirmar') {
                  <p-button label="Finalizar atención" [loading]="mutating()" [disabled]="mutating()"
                            (onClick)="advanceCurrent()" />
                }
                @case ('facturacion') {
                  <!-- U4 (KAN-246): antes el botón vivía dentro de fin-cobro-atencion, inconsistente
                       con el resto de los pasos. Ahora sube al footer del shell vía viewChild, tanto
                       "Confirmar cobro" como, tras el pago exitoso, "Continuar" — igual que el resto
                       de los pasos. "Imprimir" queda en la card del comprobante. -->
                  @if (!cobroAtencionRef()?.result()) {
                    <p-button label="Confirmar cobro" icon="pi pi-check"
                              [loading]="cobroAtencionRef()?.submitting() ?? false"
                              [disabled]="!(cobroAtencionRef()?.puedeConfirmar() ?? false)"
                              (onClick)="cobroAtencionRef()?.confirmar()"
                              data-testid="cobro-confirmar" />
                  } @else {
                    <p-button label="Continuar" icon="pi pi-arrow-right"
                              (onClick)="cobroAtencionRef()?.continuarTrasExito()"
                              data-testid="cobro-continuar" />
                  }
                }
                @case ('analisis') {
                  @if (modoExpress()) {
                    <!-- KAN-140: modo express urgente — salta cobro/facturación/confirmación. -->
                    <p-button label="Iniciar urgente" severity="danger"
                              [loading]="mutating()" [disabled]="analysisCount() === 0 || mutating()"
                              (onClick)="onIniciarUrgente()" />
                  } @else {
                    <p-button label="Continuar" [loading]="mutating()" [disabled]="continueDisabled()"
                              (onClick)="advanceCurrent()" />
                  }
                }
                @default {
                  <p-button label="Continuar" [loading]="mutating()" [disabled]="continueDisabled()"
                            (onClick)="advanceCurrent()" />
                }
              }
            </div>
          }
        </ui-wizard-shell>
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

  /** Set vacío estable para el `[visited]` del shell en modo "creating" (nada completado aún). */
  protected readonly emptySet: ReadonlySet<number> = new Set();

  protected readonly detail   = this.store.selectSignal(selectDetail);
  protected readonly loading  = this.store.selectSignal(selectDetailLoading);
  protected readonly mutating = this.store.selectSignal(selectMutating);
  protected readonly copaymentMutating = this.store.selectSignal(selectCopaymentMutating);
  protected readonly patientResolving = this.store.selectSignal(selectPatientResolving);
  protected readonly isTerminal    = isTerminal;
  protected readonly AttentionState = AttentionState;

  // Item 1: la navegación se centraliza en el contenedor. Referencias a los step
  // components para disparar su acción de avance desde el footer del shell.
  private readonly datosRef    = viewChild(DatosGeneralesStepComponent);
  private readonly analisisRef = viewChild(AnalisisStepComponent);
  private readonly resumenRef  = viewChild(ResumenStepComponent);
  /**
   * U4 (KAN-246): "Confirmar cobro" ahora vive en el [wizardFooter], igual que el resto de los pasos.
   * `protected` (no `private`): a diferencia de datosRef/analisisRef/resumenRef —que solo se leen
   * desde métodos de la clase—, este se referencia directo en el template.
   */
  protected readonly cobroAtencionRef = viewChild(CobroAtencionComponent);

  /** Cantidad de análisis cargados en el paso 2 (lo emite el step). Gate de "Continuar". */
  protected readonly analysisCount = signal(0);

  /**
   * "Confirmar y seguir" del paso 1: habilitado con un paciente resuelto y sin una
   * búsqueda de DNI en curso. Se deriva del store (reactivo) en vez de leer el step
   * vía viewChild, para que el `[disabled]` del footer se refresque correctamente.
   */
  protected readonly datosCanConfirm = computed(
    () => this.resolvedPatient() != null && !this.patientResolving(),
  );

  /** Disabled del botón "Continuar" del footer, según el paso actual. */
  protected continueDisabled(): boolean {
    switch (this.uiStep()?.key) {
      case 'datos':    return !this.datosCanConfirm();
      case 'analisis': return this.analysisCount() === 0 || this.mutating();
      // KAN-246 B5: si el copago se está persistiendo (blur en cobro-step), esperamos a
      // que termine antes de habilitar "Continuar" — endCollection decide ON_BILLING_PROCESS
      // vs AWAITING_CONFIRMATION según el total, y necesita leer el copago ya persistido.
      case 'cobro':    return this.mutating() || this.copaymentMutating();
      default:         return this.mutating();
    }
  }

  /** Modo express urgente (KAN-140): despacha advanceUrgent desde el footer del paso analisis. */
  protected onIniciarUrgente(): void {
    this.analisisRef()?.onIniciarUrgente();
  }

  /** Dispara la acción de avance del paso actual desde el footer del shell. */
  protected advanceCurrent(): void {
    switch (this.uiStep()?.key) {
      case 'datos':     this.datosRef()?.onConfirm(); break;
      case 'analisis':  this.analisisRef()?.onContinue(); break;
      case 'cobro':     {
        // endCollection: ON_COLLECTION_PROCESS -> ON_BILLING_PROCESS (o directo a
        // AWAITING_CONFIRMATION si no hay nada que cobrar — EndCollectionPhaseUseCase
        // decide el salto server-side, KAN-246 B5). Limpiamos el override de UI para
        // que el wizard siga el estado real del backend hacia donde haya aterrizado
        // (si no, el override 'cobro' dejaba la UI clavada en el paso Cobro tras avanzar).
        const d = this.detail();
        if (d) { this.store.dispatch(endCollection({ id: d.id })); this.uiStepOverride.set(null); }
        break;
      }
      case 'confirmar': this.resumenRef()?.openFinalize(); break;
    }
  }

  /**
   * Título grande del header (C6): el código público del turno (ST-/CT-…) si existe.
   * Fallback al número interno de atención cuando publicCode es null/vacío.
   */
  /**
   * Título del header. Prioridad:
   * 1) publicCode del turno (ST-001 / CT-002) si la atención vino de un tótem.
   * 2) Si NO hay publicCode (tenant sin tótem / walk-in) → N° de documento del paciente.
   * 3) Fallback final → attentionNumber. (T4)
   */
  protected readonly resolvedPatient = this.store.selectSignal(selectResolvedPatient);
  protected readonly headerTitle = computed<string>(() => {
    const d = this.detail();
    if (!d) return '';
    const code = d.publicCode?.trim();
    if (code) return code;
    // El detalle no siempre trae patientDni; usamos el DNI del paciente resuelto.
    const dni = (d.patientDni ?? this.resolvedPatient()?.dni)?.trim();
    return dni ? dni : d.attentionNumber;
  });

  protected readonly cancelModalOpen = signal(false);
  protected canCancel(): boolean {
    const s = this.detail()?.attentionState;
    return s != null && !isTerminal(s) && !this.isPostSecretary();
  }

  /**
   * Solo-lectura: estados terminales (FINISHED/CANCELED/FAILED) y post-secretaría
   * (AWAITING_EXTRACTION/IN_EXTRACTION). El wizard se muestra navegable pero sin
   * acciones mutadoras ni "Cancelar atención". (NEW-E)
   */
  protected readonly readOnly = computed<boolean>(() => {
    const s = this.detail()?.attentionState;
    return s != null && (isTerminal(s) || this.isPostSecretary());
  });

  /** Banner de estado en solo-lectura: "<estado> — solo lectura". (NEW-E) */
  protected readOnlyBanner(): string {
    const s = this.detail()?.attentionState;
    if (s == null) return 'Solo lectura';
    return `${attentionStateLabel(s)} — solo lectura`;
  }

  /** Navegación libre del header en solo-lectura: setea el override al paso clickeado. (NEW-E) */
  protected goToStep(index: number): void {
    const step = this.visibleSteps()[index];
    if (step) this.uiStepOverride.set(step.key);
  }

  /** Pasos del modo express urgente (KAN-140): se excluyen cobro, facturación y confirmar. */
  private static readonly EXPRESS_EXCLUDED: ReadonlySet<StepKey> = new Set<StepKey>(['cobro', 'facturacion', 'confirmar']);

  /** ¿Estamos en modo express urgente? = la atención es urgente y URGENCIAS está activo. */
  protected readonly modoExpress = computed<boolean>(
    () => !!(this.detail()?.isUrgent) && this.registry.isActive(ModuleKey.Urgencias)
  );

  protected readonly visibleSteps = computed<WizardStepDef[]>(() => {
    const express = this.modoExpress();
    return ALL_STEPS.filter((s) => {
      if (s.requires && !this.registry.isActive(s.requires)) return false;
      if (express && AtencionWizardComponent.EXPRESS_EXCLUDED.has(s.key)) return false;
      return true;
    });
  });
  protected readonly stepFromState = computed<WizardStepDef | null>(() => {
    const d = this.detail();
    if (!d) return null;
    return this.visibleSteps().find((s) => s.matchesStates.includes(d.attentionState)) ?? null;
  });
  private readonly uiStepOverride = signal<StepKey | null>(null);
  protected readonly uiStep = computed<WizardStepDef | null>(() => {
    const o = this.uiStepOverride();
    if (o) return this.visibleSteps().find((s) => s.key === o) ?? this.stepFromState();
    const fromState = this.stepFromState();
    // En solo-lectura (terminal / post-secretaría) el estado del backend no mapea a
    // ningún paso del wizard, así que `stepFromState` es null. Mostramos el primer paso
    // por defecto para que el stepper navegable arranque en "Datos generales". (NEW-E)
    //
    // En modo "creating" (/atencion/nueva) todavía NO hay detail → stepFromState es null;
    // sin este fallback uiStep() quedaba null y `advanceCurrent()` no matcheaba 'datos',
    // así que "Confirmar y seguir" no disparaba onConfirm() (no creaba la atención).
    if (fromState == null && (this.readOnly() || this.creating())) return this.visibleSteps()[0] ?? null;
    return fromState;
  });
  protected readonly activeIndex = computed(() => {
    const a = this.uiStep();
    return a ? this.visibleSteps().findIndex((s) => s.key === a.key) : -1;
  });

  /** Pasos para el header compartido (solo lectura: dirigido por la máquina de estados). */
  protected readonly stepperSteps = computed<FormStep[]>(() =>
    this.visibleSteps().map((s) => ({ key: s.key, title: s.label }))
  );
  /**
   * Índices completados = los anteriores al paso VISIBLE actual (`activeIndex`, derivado
   * de `uiStep()`), no al paso real del backend. Así, al ver el Paso 3 vía override
   * (después de cargar análisis), los pasos 1 y 2 quedan en verde aunque el backend
   * todavía esté en REGISTERING_ANALYSES. Al "Volver fase" el override se limpia y
   * `activeIndex` cae al paso real, manteniendo la coherencia. (NEW-C)
   *
   * En modo solo-lectura marcamos TODOS los pasos anteriores al visible como completados
   * (mismo cálculo), de modo que la navegación libre del header los muestre verdes.
   */
  protected readonly completedSteps = computed<ReadonlySet<number>>(() => {
    const n = this.visibleSteps().length;
    // En solo-lectura la atención ya recorrió todos los pasos: marcamos TODOS como
    // visitados para que el header los deje clickear (navegación libre read-only).
    if (this.readOnly()) return new Set<number>(Array.from({ length: n }, (_, i) => i));
    const activeIdx = this.activeIndex();
    if (activeIdx < 0) return new Set<number>();
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
        // Modo crear nueva: el step de datos arranca EN BLANCO. (T1)
        // Reseteamos el wizard para limpiar el paciente resuelto / detail que pudo
        // quedar de una atención anterior — si no, "Nueva atención" mostraba precargado
        // el último paciente. El DNI inicial (si hay) llega por `?dni=` y el datos-step
        // lo re-resuelve en su ngOnInit.
        this.store.dispatch(resetAtencionWizard());
      } else {
        const restored = readAtencionSession();
        if (restored && restored.atencionId > 0) {
          this.store.dispatch(loadAtencion({ id: restored.atencionId }));
        }
      }
    });

    // T4: aseguramos que el paciente resuelto coincida con el detail, así el título
    // (que cae al DNI cuando no hay publicCode) muestra el documento en TODOS los pasos
    // (no solo en los que resuelven el paciente). Evita re-pegar si ya está resuelto.
    effect(() => {
      const pid = this.detail()?.patientId;
      if (pid != null && this.resolvedPatient()?.id !== pid) {
        this.store.dispatch(loadAttentionPatient({ patientId: pid }));
      }
    });
  }

  canReturn(): boolean {
    const s = this.detail()?.attentionState;
    // KAN-246 B4: una vez registrado el cobro (paymentId != null) no se puede retroceder —
    // el backend rechaza el intento igual (ReturnPhaseUseCase), pero ocultamos el botón para
    // no mostrar una acción que va a fallar. Sin escape hatch: la salida es cancelar.
    return s != null && s !== AttentionState.REGISTERING_GENERAL_DATA && !isTerminal(s)
      && this.detail()?.paymentId == null;
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
    // Estamos en el paso real → retroceder de verdad en el backend. ReturnPhaseUseCase ya
    // hace el doble salto server-side cuando corresponde (KAN-246 B5, simétrico al bypass
    // de EndCollectionPhaseUseCase) — no hay nada más que orquestar acá.
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
    this.waitForMutation((success) => {
      if (success) {
        clearAtencionSession();
        clearAnalisisDraft(d.id);
        this.store.dispatch(resetAtencionWizard());
        this.router.navigate(['/turnos/recepcion']);
      }
    });
  }

  /**
   * `success` trae el `item` (atención actualizada) tal cual vino del backend — no depender
   * de leer `this.detail()` acá adentro, que puede no estar sincronizado todavía según el
   * orden de suscripción interno de NgRx entre el reducer y este subscriber del componente.
   */
  private waitForMutation(cb: (success: ReturnType<typeof atencionMutationSuccess> | null) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type ? action as ReturnType<typeof atencionMutationSuccess> : null));
  }
  onAnalysisAdvanced(): void {
    const steps = this.visibleSteps();
    const idx = steps.findIndex((s) => s.key === 'analisis');
    const next = steps[idx + 1]?.key;
    if (!next) return;
    // Con FINANCIERO activo el siguiente paso es 'cobro' (ON_COLLECTION_PROCESS). El backend
    // solo entra a esa fase vía addPayment; en el flujo nuevo aún no hay pago (se registra en
    // facturación), así que disparamos addPayment con paymentId null = transición de fase pura.
    // Sin esto, el paso Cobro dispara endCollection sobre REGISTERING_ANALYSES → 409.
    const d = this.detail();
    if (next === 'cobro' && d) {
      this.store.dispatch(addPayment({ id: d.id, payload: { paymentId: null } }));
    }
    this.uiStepOverride.set(next);
  }
  onFinished(): void {
    const d = this.detail();
    clearAtencionSession();
    if (d) clearAnalisisDraft(d.id);
    this.store.dispatch(resetAtencionWizard());
    this.router.navigate(['/turnos/recepcion']);
  }
  downloadLabels(): void {
    const d = this.detail();
    if (!d || d.protocolId == null) return;
    this.store.dispatch(downloadProtocolLabels({ protocolId: d.protocolId, protocolNumber: `P-${d.protocolId}` }));
  }

  /** "Volver al listado" — navega a recepción sin mutar la atención. (NEW-D) */
  backToList(): void {
    this.router.navigate(['/turnos/recepcion']);
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
