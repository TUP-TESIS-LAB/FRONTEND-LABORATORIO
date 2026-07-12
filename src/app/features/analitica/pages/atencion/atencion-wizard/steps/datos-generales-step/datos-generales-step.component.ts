import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { NgClass } from '@angular/common';
import { Gender, SexAtBirth } from '@features/pacientes/models/patient.model';
import { CoverageCatalog, EMPTY_CATALOG, InsurerOption, PlanOption, insurerNameForPlan, planName, plansForInsurer, planById } from '@features/pacientes/models/coverage-catalog.model';
import { CoverageCatalogService } from '@features/pacientes/services/coverage-catalog.service';
import { Doctor } from '@features/medicos/models/doctor.model';
import { DoctorService } from '@features/medicos/services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { PortalAccessDialogComponent } from '@features/analitica/components/portal-access-dialog/portal-access-dialog.component';
import {
  assignGeneralData,
  createPatientInline,
  loadAttentionPatient,
  loadPatientGuardians,
  resolvePatientByDni,
  setUrgentFlag,
  startAttentionForPatient,
  updatePatientInline,
  validateBond,
  verifyPatient,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectBondMutating,
  selectPatientNotFoundDni,
  selectPatientResolving,
  selectPatientResolutionError,
  selectPendingGuardian,
  selectVerifiedGuardian,
  selectResolvedPatient,
} from '../../../../../store/atencion/atencion.selectors';
import { PatientGuardian } from '../../../../../models/patient-guardian.model';

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'NOT_SPECIFIED', label: 'Sin especificar' },
];

const SEX_OPTS: { value: SexAtBirth; label: string }[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'INTERSEX', label: 'Intersex' },
];

@Component({
  selector: 'lab-datos-generales-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, FormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, PortalAccessDialogComponent],
  template: `
    <div class="flex flex-col h-full min-h-0">
      <!-- T8: contenido scrolleable interno; el footer queda abajo y la página no crece. -->
      <div class="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">

      <!-- Card única del paciente: el DNI es el primer input y queda SIEMPRE visible
           (también con paciente encontrado, para corregir un typo y re-buscar). Busca
           solo (debounce mientras se tipea + al salir del campo, sin botón "Buscar").
           Si el DNI existe se muestran los datos del paciente; si no, el resto del alta. -->
      <div class="rounded border p-4 space-y-3">
          @if (notFoundDni() && !resolved()) {
            <div class="text-sm text-surface-600">
              <i class="pi pi-info-circle mr-1"></i>
              No encontramos un paciente con DNI <b>{{ notFoundDni() }}</b>. Completá los datos para darlo de alta:
            </div>
          }
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- DNI: primer input, SIEMPRE visible; dispara la búsqueda automática -->
            <div>
              <label class="block text-sm mb-1">DNI <span class="text-red-500">*</span></label>
              <input pInputText [ngModel]="dniInput" (ngModelChange)="onDniChange($event)"
                     (blur)="buscar()" (keyup.enter)="buscar()" class="w-full"
                     placeholder="Sin puntos ni guiones" [readonly]="readOnly()" />
              @if (resolving()) {
                <small class="text-surface-500 block mt-1"><i class="pi pi-spin pi-spinner mr-1"></i>Verificando paciente…</small>
              } @else if (resolutionError()) {
                <small class="text-red-600 block mt-1"><i class="pi pi-exclamation-triangle mr-1"></i>No pudimos verificar el paciente. Reintentá.</small>
              }
            </div>
            @if (!resolved()) {
            <div>
              <label class="block text-sm mb-1">Nombre <span class="text-red-500">*</span></label>
              <input pInputText [(ngModel)]="form.firstName" class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Apellido <span class="text-red-500">*</span></label>
              <input pInputText [(ngModel)]="form.lastName" class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Fecha de nacimiento <span class="text-red-500">*</span></label>
              <input pInputText type="date" [(ngModel)]="form.birthDate" [max]="todayStr" class="w-full" />
              @if (birthDateInvalid()) {
                <small class="text-red-500">Ingresá una fecha válida (año de 4 dígitos, no futura).</small>
              }
            </div>
            <div>
              <label class="block text-sm mb-1">Género <span class="text-red-500">*</span></label>
              <p-select
                [(ngModel)]="form.gender"
                [options]="genderOpts"
                optionLabel="label"
                optionValue="value"
                placeholder="— Seleccioná —"
                appendTo="body"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Sexo al nacer <span class="text-red-500">*</span></label>
              <p-select
                [(ngModel)]="form.sexAtBirth"
                [options]="sexOpts"
                optionLabel="label"
                optionValue="value"
                placeholder="— Seleccioná —"
                appendTo="body"
                class="w-full" />
            </div>
            <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm mb-1">Obra social</label>
                <p-select
                  [ngModel]="formInsurerId()"
                  (ngModelChange)="onFormInsurerChange($event)"
                  [options]="insurerOptions()"
                  optionLabel="name"
                  optionValue="id"
                  [filter]="true"
                  filterBy="name"
                  placeholder="Particular (sin obra social)"
                  [showClear]="true"
                  appendTo="body"
                  class="w-full" />
              </div>
              @if (!isParticularSelected()) {
                <div>
                  <label class="block text-sm mb-1">Plan <span class="text-red-500">*</span></label>
                  <p-select
                    [(ngModel)]="form.planId"
                    [options]="formPlanOptions()"
                    optionLabel="name"
                    optionValue="planId"
                    placeholder="— Seleccioná —"
                    [disabled]="formInsurerId() == null"
                    appendTo="body"
                    class="w-full" />
                </div>
              }
            </div>
            @if (!isParticularSelected()) {
              <div>
                <label class="block text-sm mb-1">Número de afiliado <span class="text-red-500">*</span></label>
                <input pInputText [(ngModel)]="form.memberNumber" class="w-full" placeholder="N° de afiliado" />
              </div>
            }
          }
          </div>

          @if (notFoundDni() && !resolved()) {
            <div class="flex justify-end">
              <p-button
                label="Crear paciente"
                [disabled]="!altaValida()"
                (onClick)="crearPaciente()" />
            </div>
          }

          <!-- Paciente encontrado: datos + acciones dentro de la MISMA card. El DNI no
               se repite acá porque ya vive arriba como primer input (siempre visible). -->
          @if (resolved(); as p) {
            @if (!editing()) {
              <div class="space-y-2 pt-3 border-t">
                <div class="flex items-center gap-3">
                  <div class="font-semibold text-base flex-1">{{ p.firstName }} {{ p.lastName }}</div>
                  <span
                    data-testid="estado-badge"
                    [attr.data-estado]="estado()"
                    class="ui-estado-badge"
                    [ngClass]="{
                      'ui-estado-rojo':    estado() === 'rojo',
                      'ui-estado-naranja': estado() === 'naranja',
                      'ui-estado-verde':   estado() === 'verde'
                    }">
                    @if (estado() === 'verde') {
                      <i class="pi pi-check-circle mr-1"></i>Verificado
                    } @else if (estado() === 'naranja') {
                      <i class="pi pi-clock mr-1"></i>Sin verificar
                    } @else {
                      <i class="pi pi-times-circle mr-1"></i>No existe
                    }
                  </span>
                </div>

                <!-- Motivo de "Sin verificar": se muestra para cualquier paciente no
                     verificado (no solo los de portal), para que en atención se vea qué falta. -->
                @if (estado() === 'naranja' && faltaParaVerificar()) {
                  <div class="flex items-start gap-1 pt-1 text-xs text-surface-500" data-testid="hint-falta-verificar">
                    <i class="pi pi-info-circle mt-0.5"></i><span>{{ faltaParaVerificar() }}</span>
                  </div>
                }

                @if (portalActive() && pendingGuardian(); as g) {
                  <div data-testid="banner-relacion-pendiente" class="ui-estado-naranja" style="display:flex; flex-direction:column; gap:8px; padding:10px 12px; border-radius:8px; margin-top:8px;">
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                      <i class="pi pi-exclamation-triangle" style="margin-top:2px;"></i>
                      <span>
                        Este paciente depende de <strong>{{ g.titularNombre }}</strong> (DNI {{ g.titularDni }}).
                        La relación no está validada. Verificá los DNI antes de validar.
                      </span>
                    </div>
                    <div style="display:flex; gap:8px;">
                      <p-button label="Validar relación" size="small" severity="success"
                                [loading]="bondMutating()" (onClick)="validarRelacion(g)" />
                      <p-button label="Rechazar" size="small" severity="danger" [outlined]="true"
                                [loading]="bondMutating()" (onClick)="rechazarRelacion(g)" />
                    </div>
                  </div>
                }

                <!-- Cobertura a usar en la atención: chips seleccionables (default = la
                     principal). Permite cambiar la cobertura sin entrar a "Corregir datos". -->
                <div class="pt-1">
                  <div class="text-xs font-medium text-surface-500 mb-1">Cobertura a usar</div>
                  <div class="flex flex-wrap gap-2">
                    @for (chip of coverageChips(); track chip.planId) {
                      <button type="button" class="cov-chip"
                              [class.cov-chip--on]="selectedInsurancePlanId() === chip.planId"
                              [disabled]="readOnly()"
                              (click)="selectedInsurancePlanId.set(chip.planId)">
                        <span class="cov-chip__dot"></span>{{ chip.label }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Alerta portal -->
                @if (esPortal()) {
                  <div
                    data-testid="tilde-portal"
                    class="flex items-start gap-2 rounded border border-orange-300 bg-orange-50 p-2 text-sm text-orange-800">
                    <i class="pi pi-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                    <span>Paciente autorregistrado — constatá los datos contra el documento.</span>
                  </div>
                }

                <!-- Botón verificar: SOLO para pacientes de portal. La edición manual del
                     laboratorio ya deja al paciente verificado automáticamente. -->
                @if (!readOnly() && esPortal() && estado() !== 'rojo' && !p.verifiedAt) {
                  <div class="flex items-center gap-2 pt-1">
                    <p-button
                      data-testid="btn-verificar"
                      label="Marcar verificado"
                      severity="secondary"
                      [outlined]="true"
                      [disabled]="!puedeVerificar()"
                      (onClick)="marcarVerificado()" />
                  </div>
                }

                @if (!readOnly()) {
                  <div class="pt-1">
                    <p-button
                      label="Corregir datos"
                      severity="secondary"
                      [outlined]="true"
                      (onClick)="startEdit()" />
                  </div>
                }

                @if (portalActive()) {
                  @if (verifiedGuardian(); as g) {
                    <div class="flex items-center gap-2 pt-1 text-xs text-surface-600" data-testid="estado-gestionado-por">
                      <i class="pi pi-users"></i><span>Gestionado por {{ g.titularNombre }}</span>
                    </div>
                  } @else if (puedeCrearAcceso()) {
                    <div class="pt-1">
                      <p-button data-testid="btn-crear-acceso" label="Crear acceso al portal"
                                icon="pi pi-user-plus" size="small" (onClick)="crearAccesoPortal()" />
                    </div>
                  } @else if (p.accountStatus === 'PENDING') {
                    <div class="flex items-center gap-2 pt-1 text-xs text-surface-500" data-testid="estado-acceso-pendiente">
                      <i class="pi pi-clock"></i><span>Acceso al portal: pendiente</span>
                    </div>
                  } @else if (p.accountStatus === 'ACTIVE') {
                    <div class="flex items-center gap-2 pt-1 text-xs text-green-600" data-testid="estado-acceso-activo">
                      <i class="pi pi-check-circle"></i><span>Acceso al portal: activo</span>
                    </div>
                  }
                }
              </div>
            } @else {
              <div class="space-y-3 pt-3 border-t">
                <div class="font-medium text-sm text-surface-600 mb-1">Editar datos del paciente</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm mb-1">Nombre</label>
                    <input pInputText [(ngModel)]="form.firstName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-sm mb-1">Apellido</label>
                    <input pInputText [(ngModel)]="form.lastName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-sm mb-1">Fecha de nacimiento</label>
                    <input pInputText type="date" [(ngModel)]="form.birthDate" [max]="todayStr" class="w-full" />
                    @if (birthDateFuture()) {
                      <span class="text-xs text-red-600 mt-1 block">La fecha de nacimiento no puede ser futura.</span>
                    }
                  </div>
                  <div>
                    <label class="block text-sm mb-1">Género</label>
                    <p-select
                      [(ngModel)]="form.gender"
                      [options]="genderOpts"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="— Seleccioná —"
                      appendTo="body"
                      class="w-full" />
                  </div>
                  <div>
                    <label class="block text-sm mb-1">Sexo al nacer</label>
                    <p-select
                      [(ngModel)]="form.sexAtBirth"
                      [options]="sexOpts"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="— Seleccioná —"
                      appendTo="body"
                      class="w-full" />
                  </div>
                  <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm mb-1">Obra social</label>
                      <p-select
                        [ngModel]="formInsurerId()"
                        (ngModelChange)="onFormInsurerChange($event)"
                        [options]="insurerOptions()"
                        optionLabel="name"
                        optionValue="id"
                        [filter]="true"
                        filterBy="name"
                        placeholder="Particular (sin obra social)"
                        [showClear]="true"
                        appendTo="body"
                        class="w-full" />
                    </div>
                    @if (!isParticularSelected()) {
                      <div>
                        <label class="block text-sm mb-1">Plan</label>
                        <p-select
                          [(ngModel)]="form.planId"
                          [options]="formPlanOptions()"
                          optionLabel="name"
                          optionValue="planId"
                          placeholder="— Seleccioná —"
                          [disabled]="formInsurerId() == null"
                          appendTo="body"
                          class="w-full" />
                      </div>
                    }
                  </div>
                  @if (!isParticularSelected()) {
                    <div>
                      <label class="block text-sm mb-1">Número de afiliado</label>
                      <input pInputText [(ngModel)]="form.memberNumber" class="w-full" placeholder="N° de afiliado" />
                    </div>
                  }
                </div>
                <div class="flex justify-end">
                  <p-button label="Guardar cambios" [disabled]="birthDateFuture()" (onClick)="saveEdit()" />
                </div>
              </div>
            }
          }
        </div>

      <!-- Médico solicitante (007) -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium">Médico solicitante</label>
          @if (!readOnly()) {
            <button type="button" class="text-sm text-primary-600 hover:underline" (click)="toggleAddDoctor()">
              {{ addingDoctor() ? 'Cancelar' : 'Alta rápida' }}
            </button>
          }
        </div>

        @if (!addingDoctor()) {
          <p-select
            [ngModel]="selectedDoctorId()"
            (ngModelChange)="selectedDoctorId.set($event)"
            [options]="doctorOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            [showClear]="true"
            [disabled]="readOnly()"
            placeholder="— Sin médico / Seleccioná —"
            appendTo="body"
            class="w-full" />
        } @else {
          <div class="rounded border p-3 space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm mb-1">Nombre completo <span class="text-red-500">*</span></label>
                <input pInputText [(ngModel)]="doctorForm.fullName" class="w-full" placeholder="Nombre y apellido" />
              </div>
              <div>
                <label class="block text-sm mb-1">N° de matrícula <span class="text-red-500">*</span></label>
                <input pInputText [(ngModel)]="doctorForm.tuition" class="w-full" placeholder="Ej: 12345" />
              </div>
            </div>
            <div class="flex justify-end">
              <p-button
                label="Crear médico"
                [loading]="doctorSaving()"
                [disabled]="!altaMedicoValida() || doctorSaving()"
                (onClick)="crearMedico()" />
            </div>
          </div>
        }
      </div>

      <!-- Toggle urgente — visible solo si módulo URGENCIAS activo y no readOnly (KAN-140) -->
      @if (urgenciasActive() && !readOnly()) {
        <div data-testid="urgente-toggle-container">
          <label class="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 cursor-pointer select-none w-fit">
            <p-toggleswitch [(ngModel)]="isUrgentValue" (ngModelChange)="onUrgentChange()" inputId="urgente-toggle-recepcion" />
            <span class="text-sm font-semibold">Atención urgente</span>
          </label>
        </div>
      }

      <!-- Indicaciones + confirmar -->
      <div>
        <label class="block text-sm font-medium mb-1">Indicaciones</label>
        <input pInputText [(ngModel)]="indications" class="w-full"
               [readonly]="readOnly()" />
      </div>

      </div><!-- /contenido scrolleable -->

      <!-- Item 1: el footer (Volver fase / Confirmar y seguir) lo provee el contenedor
           (ui-wizard-shell), no el step. -->
    </div>

    <!-- Diálogo de acceso al portal (Arco 2B): gestiona rama propio / responsable. -->
    <lab-portal-access-dialog
      [visible]="portalDialogVisible()"
      [patientId]="resolved()?.id ?? null"
      [patientHasEmail]="tieneEmail()"
      (closed)="portalDialogVisible.set(false)" />
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .ui-estado-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      white-space: nowrap;
    }
    .ui-estado-verde {
      background-color: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }
    .ui-estado-naranja {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    .ui-estado-rojo {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    /* Chips de cobertura (selección de la cobertura a usar en la atención). */
    .cov-chip {
      display: inline-flex; align-items: center; gap: 7px;
      border: 1px solid #cdd5e0; border-radius: 999px;
      padding: 5px 12px 5px 10px; font-size: 0.8125rem; cursor: pointer;
      background: #fff; color: #1a1a2e;
    }
    .cov-chip:disabled { cursor: default; }
    .cov-chip__dot {
      width: 13px; height: 13px; border-radius: 50%; border: 2px solid #b6c0cf; flex: none;
    }
    .cov-chip--on { border-color: #2563eb; background: #eef4ff; color: #1e3a8a; font-weight: 600; }
    .cov-chip--on .cov-chip__dot {
      border-color: #2563eb;
      background: radial-gradient(circle at center, #2563eb 0 4px, #fff 5px);
    }
  `],
})
export class DatosGeneralesStepComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly coverageCatalog = inject(CoverageCatalogService);
  private readonly doctorsApi = inject(DoctorService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly moduleRegistry = inject(ModuleRegistry);

  /** Módulo PORTAL activo para el tenant: gatea el banner de relación familiar pendiente. */
  protected readonly portalActive = computed(() => this.moduleRegistry.isActive(ModuleKey.Portal));

  /** Módulo URGENCIAS activo: gatea el toggle de "Atención urgente" en recepción. */
  protected readonly urgenciasActive = computed(() => this.moduleRegistry.isActive(ModuleKey.Urgencias));

  /** Estado local del toggle urgente. Se hidrata desde el input initialIsUrgent en ngOnInit. */
  isUrgentValue = false;

  /** Búsqueda automática del DNI: se dispara con debounce al tipear y al blur. */
  private readonly dniSearch$ = new Subject<string>();
  /** Evita re-buscar el mismo DNI en cada blur/keystroke. */
  private lastSearchedDni = '';

  readonly atencionId = input<number | null>(null);
  readonly initialDni = input<string | null>(null);
  /**
   * Paciente ya asociado a la atención (al retomar). Cuando volvemos al paso 1 desde
   * un paso posterior NO viene un DNI por query param, así que sin esto la tarjeta del
   * paciente quedaba vacía aunque la atención ya tuviera paciente. Lo usamos para
   * rehidratar el paciente por id (mismo `patientResolved` que resolver por DNI).
   */
  readonly initialPatientId = input<number | null>(null);
  /** Indicaciones ya persistidas (al retomar). Hidratamos el input para no perderlas. (003) */
  readonly initialIndications = input<string | null>(null);
  /** Médico solicitante ya asociado (al retomar). (007) */
  readonly initialDoctorId = input<number | null>(null);
  /** Cobertura (plan) ya asociada a la atención (al retomar) — pre-selecciona el chip. */
  readonly initialInsurancePlanId = input<number | null>(null);
  /** Flag urgente ya persistido (al retomar). Se hidrata en ngOnInit para que el toggle muestre el estado real. */
  readonly initialIsUrgent = input<boolean | null>(null);

  /** Modo solo-lectura (atención terminal / post-secretaría): oculta toda acción mutadora. */
  readonly readOnly = input<boolean>(false);

  protected readonly resolved        = this.store.selectSignal(selectResolvedPatient);
  protected readonly resolving        = this.store.selectSignal(selectPatientResolving);
  protected readonly notFoundDni      = this.store.selectSignal(selectPatientNotFoundDni);
  protected readonly resolutionError  = this.store.selectSignal(selectPatientResolutionError);
  protected readonly pendingGuardian = this.store.selectSignal(selectPendingGuardian);
  protected readonly verifiedGuardian = this.store.selectSignal(selectVerifiedGuardian);
  protected readonly bondMutating    = this.store.selectSignal(selectBondMutating);
  private lastGuardiansPatientId: number | null = null;

  protected readonly editing = signal(false);

  /** Controla la visibilidad del diálogo de acceso al portal (Arco 2B). */
  protected readonly portalDialogVisible = signal(false);

  // ── Cobertura del alta/edición inline: cascada Obra social → Plan ────────────
  /** Obra social elegida en el form de alta/edición (UI; el plan es lo que se envía). */
  protected readonly formInsurerId = signal<number | null>(null);
  /** Obras sociales seleccionables (incluye Particular para pago directo). */
  protected readonly insurerOptions = computed<InsurerOption[]>(() => {
    // Solo obras sociales reales, alfabético. "Particular" = dejar la OS vacía (sin cobertura).
    return [...this.catalog().insurers].sort((a, b) => a.name.localeCompare(b.name));
  });
  /** Planes de la obra social elegida en el form. */
  protected readonly formPlanOptions = computed<PlanOption[]>(() => plansForInsurer(this.catalog(), this.formInsurerId()));

  // ── Cobertura a usar en la atención (chips) ─────────────────────────────────
  /** Catálogo de coberturas para resolver el label de cada chip (obra social + plan). */
  protected readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);
  /** Plan elegido para la atención. null = Particular (sin obra social). */
  protected readonly selectedInsurancePlanId = signal<number | null>(null);
  /** Para no pisar la selección manual del operador al re-evaluar el paciente. */
  private lastDefaultedPatientId: number | null = null;

  /** Chips: Particular + cada cobertura activa del paciente (obra social · plan · N° afiliado). */
  protected readonly coverageChips = computed<{ planId: number | null; label: string }[]>(() => {
    const p = this.resolved();
    const cat = this.catalog();
    const chips: { planId: number | null; label: string }[] = [{ planId: null, label: 'Particular' }];
    // El chip "Particular" (sin cobertura) va fijo arriba; debajo, las coberturas activas del paciente.
    for (const c of (p?.coverages ?? []).filter((x) => x.active)) {
      const member = c.memberNumber ? ` · N° ${c.memberNumber}` : '';
      chips.push({ planId: c.planId, label: `${insurerNameForPlan(cat, c.planId)} ${planName(cat, c.planId)}${member}` });
    }
    return chips;
  });

  // ── Médico solicitante (007) ────────────────────────────────────────────────
  protected readonly doctors        = signal<Doctor[]>([]);
  protected readonly selectedDoctorId = signal<number | null>(null);
  protected readonly addingDoctor   = signal(false);
  protected readonly doctorSaving   = signal(false);
  protected doctorForm = { fullName: '', tuition: '' };
  protected readonly doctorOptions = computed(() =>
    this.doctors().map((d) => ({ value: d.id, label: `${d.lastName}, ${d.firstName} — Mat. ${d.tuition}` })),
  );

  protected dniInput   = '';
  protected indications = '';
  // Alta/edit form uses template-driven ngModel on a plain object; [disabled] on the button
  // re-evaluates via ngModelChange's markForCheck triggered by FormsModule under OnPush.
  protected form = {
    dni:          '',
    firstName:    '',
    lastName:     '',
    birthDate:    '',
    gender:       null as Gender | null,
    sexAtBirth:   null as SexAtBirth | null,
    planId:       null as number | null,
    memberNumber: '',
  };

  protected readonly genderOpts = GENDER_OPTS;
  protected readonly sexOpts    = SEX_OPTS;

  /** Hoy en YYYY-MM-DD para el `[max]` de los inputs de fecha (no permitir futuro). (T2) */
  protected readonly todayStr = (() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  /** True si la fecha de nacimiento del form es futura (string YYYY-MM-DD). (T2) */
  protected birthDateFuture(): boolean {
    return this.birthDateInvalid();
  }

  /**
   * Fecha de nacimiento inválida: vacía no cuenta acá (lo cubre "obligatorio"),
   * pero un año que no tenga 4 dígitos (p. ej. el input deja tipear 5+) o una
   * fecha futura sí. La comparación de strings sola no alcanza: '12345-01-01'
   * es lexicográficamente menor que el año actual, así que validamos el formato.
   */
  protected birthDateInvalid(): boolean {
    const b = this.form.birthDate;
    if (!b) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return true; // año != 4 dígitos / formato raro
    return b > this.todayStr;                         // futura
  }

  /** Sin obra social (Particular) → plan y N° de afiliado no son obligatorios. */
  protected isParticularSelected(): boolean {
    return this.formInsurerId() == null;
  }

  /** Plan de la cobertura principal activa del paciente resuelto; null = Particular. */
  private primaryCoveragePlanId(): number | null {
    const p = this.resolved();
    const primary = p?.coverages?.find((c) => c.isPrimary && c.active)
      ?? p?.coverages?.find((c) => c.active) ?? null;
    return primary?.planId ?? null;
  }

  // ── 3-state badge ──────────────────────────────────────────────────────────
  protected readonly estado = computed<'rojo' | 'naranja' | 'verde'>(() => {
    if (this.notFoundDni()) return 'rojo';
    const p = this.resolved();
    if (!p) return 'rojo';
    return p.verifiedAt ? 'verde' : 'naranja';
  });

  // ── Portal tilde ───────────────────────────────────────────────────────────
  protected readonly esPortal = computed(() => this.resolved()?.source === 'PORTAL');

  // ── Portal account gate ────────────────────────────────────────────────────
  protected readonly tieneEmail = computed(() => {
    const p = this.resolved();
    return !!p && (p.contacts ?? []).some(c => c.contactType === 'EMAIL' && c.active);
  });

  protected readonly puedeCrearAcceso = computed(() => {
    const p = this.resolved();
    // El email ya no es condición para mostrar el botón: el diálogo gestiona ambas ramas
    // (propio → requiere email; responsable → no lo requiere).
    // Si ya hay un responsable verificado gestionando al paciente, no se ofrece crear acceso
    // (se muestra "Gestionado por" en su lugar).
    return !!p && !this.readOnly() && p.accountStatus === 'NONE' && !this.verifiedGuardian();
  });

  // ── Verify gate ────────────────────────────────────────────────────────────
  protected readonly puedeVerificar = computed(() => {
    const p = this.resolved();
    if (!p || p.verifiedAt) return false;
    const identidad = !!(p.dni && p.firstName && p.lastName && p.birthDate && p.gender && p.sexAtBirth);
    const cobertura = (p.coverages ?? []).some(c => c.active);
    return identidad && cobertura;
  });

  protected readonly faltaParaVerificar = computed(() => {
    const p = this.resolved();
    if (!p) return '';
    const faltaId  = !(p.dni && p.firstName && p.lastName && p.birthDate && p.gender && p.sexAtBirth);
    const faltaCob = !(p.coverages ?? []).some(c => c.active);
    if (faltaId && faltaCob) return 'Faltan datos de identidad y una cobertura activa.';
    if (faltaId)  return 'Faltan datos de identidad.';
    if (faltaCob) return 'Falta una cobertura activa.';
    return '';
  });

  // When backend confirms DNI not found, pre-fill the alta form's DNI field
  constructor() {
    // Búsqueda automática del DNI: debounce mientras se tipea (el blur la dispara ya).
    this.dniSearch$.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.buscar());

    // El DNI del alta sale del buscador de arriba (ya no hay campo DNI en el alta):
    // sincronizamos form.dni con el último DNI no encontrado.
    effect(() => {
      const dni = this.notFoundDni();
      if (dni) this.form.dni = dni;
    });

    // Default de la cobertura a usar cuando (re)aparece el paciente: el plan ya asociado a la
    // atención (al retomar) → la cobertura principal activa → Particular (null). Se setea una vez
    // por paciente para no pisar un cambio manual del operador.
    // GAP B (KAN-188): en recepción express con el toggle urgente ON diferimos la obra social →
    // default a Particular (sin cobertura); se reconcilia después. Solo en el alta nueva.
    effect(() => {
      const p = this.resolved();
      if (!p) { this.lastDefaultedPatientId = null; return; }
      if (this.lastDefaultedPatientId === p.id) return;
      this.lastDefaultedPatientId = p.id;
      const initial = this.initialInsurancePlanId();
      if (initial != null) { this.selectedInsurancePlanId.set(initial); return; }
      this.selectedInsurancePlanId.set(this.isUrgentValue ? null : this.primaryCoveragePlanId());
    });

    // Carga los guardians (relaciones familiares) cuando aparece un nuevo paciente resuelto.
    // Se evita re-disparar para el mismo id para no hacer peticiones redundantes.
    effect(() => {
      const p = this.resolved();
      if (!p) { this.lastGuardiansPatientId = null; return; }
      if (this.lastGuardiansPatientId === p.id) return;
      this.lastGuardiansPatientId = p.id;
      this.store.dispatch(loadPatientGuardians({ patientId: p.id }));
    });
  }

  ngOnInit(): void {
    // Catálogo (obras sociales + planes): alimenta los chips de cobertura y la
    // cascada Obra social → Plan del alta/edición inline. Al cargar, default a
    // Particular en el form si todavía no hay plan elegido.
    this.coverageCatalog.getCatalog().pipe(
      catchError(() => EMPTY),
    ).subscribe(cat => {
      this.catalog.set(cat);
      this.defaultFormCobertura();
    });

    // Cargar médicos solicitantes para el selector (errores silenciados → queda vacío). (007)
    this.doctorsApi.list().pipe(
      catchError(() => EMPTY),
    ).subscribe(list => this.doctors.set(list.filter(d => d.active)));

    // Hidratar lo ya persistido al retomar la atención. (003 / 007 / urgente)
    const ind = this.initialIndications();
    if (ind != null) this.indications = ind;
    this.selectedDoctorId.set(this.initialDoctorId());
    const isUrgent = this.initialIsUrgent();
    if (isUrgent != null) this.isUrgentValue = isUrgent;

    const dni = this.initialDni();
    if (dni) {
      this.dniInput = dni;
      this.store.dispatch(resolvePatientByDni({ dni }));
      return;
    }

    // Sin DNI por query param pero retomando una atención con paciente ya asignado:
    // rehidratamos el paciente por id para que la tarjeta no quede vacía al volver al
    // paso 1. Si ya hay un paciente resuelto en el store (p. ej. venimos del mismo
    // flujo sin recargar), no re-pegamos al back.
    const patientId = this.initialPatientId();
    if (patientId != null && this.resolved()?.id !== patientId) {
      this.store.dispatch(loadAttentionPatient({ patientId }));
    }
  }

  // ── Médico solicitante (007) ────────────────────────────────────────────────
  toggleAddDoctor(): void {
    this.addingDoctor.update(v => !v);
  }

  /** Alta rápida: nombre completo (≥2 palabras) + matrícula, ambos requeridos. */
  altaMedicoValida(): boolean {
    const partes = this.doctorForm.fullName.trim().split(/\s+/).filter(Boolean);
    return partes.length >= 2 && !!this.doctorForm.tuition.trim();
  }

  crearMedico(): void {
    if (!this.altaMedicoValida() || this.doctorSaving()) return;
    const partes = this.doctorForm.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = partes[0];
    const lastName  = partes.slice(1).join(' ');
    this.doctorSaving.set(true);
    this.doctorsApi.quickCreate({ firstName, lastName, tuition: this.doctorForm.tuition.trim() }).subscribe({
      next: (doc) => {
        this.doctors.update(list => [doc, ...list.filter(d => d.id !== doc.id)]);
        this.selectedDoctorId.set(doc.id);
        this.doctorForm = { fullName: '', tuition: '' };
        this.addingDoctor.set(false);
        this.doctorSaving.set(false);
      },
      error: (err) => {
        this.doctorSaving.set(false);
        this.notification.error(this.doctorErrorMessage(err?.status));
      },
    });
  }

  /** Mensaje en español, sin leak de internals (regla #4). */
  private doctorErrorMessage(status: number | undefined): string {
    if (status === 409) return 'Ya existe un médico con esa matrícula.';
    return 'No se pudo dar de alta el médico. Revisá los datos y volvé a intentarlo.';
  }

  protected readonly canConfirm = computed(() => this.resolved() != null && !this.resolving());

  /** Tipeo en el DNI: empuja al debounce de búsqueda automática. */
  onDniChange(value: string): void {
    this.dniInput = value;
    this.dniSearch$.next(value.trim());
  }

  buscar(): void {
    if (this.readOnly()) return;
    const dni = this.dniInput.trim();
    // Mínimo 7 dígitos y no re-buscar el mismo DNI (evita dispatches en cada blur).
    if (dni.length < 7 || dni === this.lastSearchedDni) return;
    this.lastSearchedDni = dni;
    this.store.dispatch(resolvePatientByDni({ dni }));
  }

  /** Cambio de obra social en el form: resetea el plan (auto-selecciona si hay uno solo). */
  onFormInsurerChange(insurerId: number | null): void {
    this.formInsurerId.set(insurerId);
    const plans = plansForInsurer(this.catalog(), insurerId);
    this.form.planId = plans.length === 1 ? plans[0].planId : null;
  }

  /** Default del form: sincroniza la OS con el plan elegido; sin plan = Particular (sin OS). */
  private defaultFormCobertura(): void {
    this.formInsurerId.set(planById(this.catalog(), this.form.planId)?.insurerId ?? null);
  }

  startEdit(): void {
    const p = this.resolved();
    if (!p) return;
    // Populate planId from the patient's primary active coverage (if any)
    const primaryCoverage = p.coverages?.find(c => c.isPrimary && c.active) ?? p.coverages?.find(c => c.active) ?? null;
    this.form = {
      dni:          p.dni,
      firstName:    p.firstName,
      lastName:     p.lastName,
      birthDate:    p.birthDate ?? '',
      gender:       p.gender,
      sexAtBirth:   p.sexAtBirth,
      planId:       primaryCoverage?.planId ?? null,
      memberNumber: primaryCoverage?.memberNumber ?? '',
    };
    // Sincroniza la obra social de la cascada con el plan del paciente (o Particular).
    this.formInsurerId.set(planById(this.catalog(), this.form.planId)?.insurerId ?? null);
    this.editing.set(true);
  }

  saveEdit(): void {
    const p = this.resolved();
    if (!p) return;
    if (this.birthDateFuture()) return; // T2: fecha de nacimiento no futura
    // Build the coverage: use newly selected plan; otherwise keep existing coverages
    const coverages = this.form.planId != null
      ? [{ planId: this.form.planId, memberNumber: this.form.memberNumber || '', isPrimary: true, active: true }]
      : p.coverages;
    this.store.dispatch(
      updatePatientInline({
        id: p.id,
        payload: {
          firstName:  this.form.firstName,
          lastName:   this.form.lastName,
          birthDate:  this.form.birthDate || null,
          gender:     this.form.gender,
          sexAtBirth: this.form.sexAtBirth,
          contacts:   p.contacts,
          addresses:  p.addresses,
          coverages,
        },
      }),
    );
    this.editing.set(false);
  }

  altaValida(): boolean {
    const f = this.form;
    // Identidad + nacimiento + género/sexo + cobertura son obligatorios.
    if (!f.dni || !f.firstName || !f.lastName || !f.birthDate) return false;
    if (f.gender == null || f.sexAtBirth == null) return false;
    // Cobertura opcional: sin OS = Particular. Si se eligió OS, el plan y el N° de afiliado son obligatorios.
    if (this.formInsurerId() != null && f.planId == null) return false;
    if (!this.isParticularSelected() && !f.memberNumber.trim()) return false;
    return !this.birthDateInvalid();
  }

  crearPaciente(): void {
    if (!this.altaValida()) return;
    const f = this.form;
    const coverages = f.planId != null
      ? [{ planId: f.planId, memberNumber: f.memberNumber || '', isPrimary: true, active: true }]
      : [];
    this.store.dispatch(
      createPatientInline({
        payload: {
          dni:        f.dni,
          firstName:  f.firstName,
          lastName:   f.lastName,
          birthDate:  f.birthDate || null,
          gender:     f.gender,
          sexAtBirth: f.sexAtBirth,
          contacts:   [],
          addresses:  [],
          coverages,
        },
      }),
    );
  }

  marcarVerificado(): void {
    const p = this.resolved();
    if (!p) return;
    this.store.dispatch(verifyPatient({ id: p.id }));
  }

  protected crearAccesoPortal(): void {
    const p = this.resolved();
    if (!p || this.readOnly() || p.accountStatus !== 'NONE') return;
    // Arco 2B: abre el diálogo que gestiona ambas ramas (propio / responsable).
    this.portalDialogVisible.set(true);
  }

  protected validarRelacion(g: PatientGuardian): void {
    this.store.dispatch(validateBond({ userPatientId: g.userPatientId, status: 'VERIFIED' }));
  }

  protected rechazarRelacion(g: PatientGuardian): void {
    this.store.dispatch(validateBond({ userPatientId: g.userPatientId, status: 'REJECTED' }));
  }

  /** Cambio del toggle urgente: persiste inmediatamente vía endpoint dedicado (KAN-140). */
  onUrgentChange(): void {
    const id = this.atencionId();
    // GAP B (KAN-188): recepción express difiere la obra social. Al marcar urgente en un alta
    // nueva, default a Particular (sin cobertura); al desmarcar, volvemos a la cobertura principal.
    // El operador siempre puede re-elegir el chip después. Al retomar (id≠null) no tocamos la OS.
    if (id == null) {
      this.selectedInsurancePlanId.set(this.isUrgentValue ? null : this.primaryCoveragePlanId());
      return;
    }
    this.store.dispatch(setUrgentFlag({ id, isUrgent: this.isUrgentValue }));
  }

  onConfirm(): void {
    const p = this.resolved();
    if (!p) return;
    const doctorId = this.selectedDoctorId();
    const insurancePlanId = this.selectedInsurancePlanId();
    const id = this.atencionId();
    if (id == null) {
      const qid = this.route.snapshot.queryParamMap.get('queueEntryId');
      const queueEntryId = qid ? Number(qid) : null;
      this.store.dispatch(
        startAttentionForPatient({
          patientId:   p.id,
          doctorId,
          insurancePlanId,
          indications: this.indications || null,
          queueEntryId,
          isUrgent:    this.isUrgentValue,
        }),
      );
      return;
    }
    this.store.dispatch(
      assignGeneralData({
        id,
        payload: {
          patientId:       p.id,
          doctorId,
          insurancePlanId,
          indications:     this.indications || null,
        },
      }),
    );
  }
}
