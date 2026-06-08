import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { NgClass } from '@angular/common';
import { Gender, SexAtBirth } from '@features/pacientes/models/patient.model';
import { CoveragePlanOption } from '@features/pacientes/models/coverage-plans.catalog';
import { CoveragePlansService } from '@features/pacientes/services/coverage-plans.service';
import {
  assignGeneralData,
  createPatientInline,
  resolvePatientByDni,
  startAttentionForPatient,
  updatePatientInline,
  verifyPatient,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectPatientNotFoundDni,
  selectPatientResolving,
  selectPatientResolutionError,
  selectResolvedPatient,
} from '../../../../../store/atencion/atencion.selectors';

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
  imports: [NgClass, FormsModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <div class="space-y-4">

      <!-- Búsqueda por DNI -->
      <div class="flex gap-2 items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium mb-1">DNI del paciente</label>
          <input pInputText [(ngModel)]="dniInput" class="w-full" placeholder="Sin puntos ni guiones" />
        </div>
        <p-button label="Buscar" icon="pi pi-search" [loading]="resolving()" (onClick)="buscar()" />
      </div>

      @if (resolving()) {
        <div class="text-sm opacity-70">
          <i class="pi pi-spin pi-spinner mr-1"></i>Verificando paciente…
        </div>
      }

      @if (resolutionError()) {
        <div class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <i class="pi pi-exclamation-triangle mr-1"></i>
          No pudimos verificar el paciente. Reintentá.
        </div>
      }

      <!-- Caso A: paciente encontrado -->
      @if (resolved(); as p) {
        @if (!editing()) {
          <div class="rounded border p-4 space-y-2 bg-surface-50">
            <div class="flex items-center gap-3">
              <div class="font-semibold text-base flex-1">{{ p.firstName }} {{ p.lastName }}</div>
              <!-- Badge tres estados -->
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

            <div class="text-sm text-surface-600">DNI {{ p.dni }}</div>

            <!-- Alerta portal -->
            @if (esPortal()) {
              <div
                data-testid="tilde-portal"
                class="flex items-start gap-2 rounded border border-orange-300 bg-orange-50 p-2 text-sm text-orange-800">
                <i class="pi pi-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                <span>Paciente autorregistrado — constatá los datos contra el documento.</span>
              </div>
            }

            <!-- Botón verificar -->
            @if (estado() !== 'rojo' && !p.verifiedAt) {
              <div class="flex items-center gap-2 pt-1">
                <p-button
                  data-testid="btn-verificar"
                  label="Marcar verificado"
                  icon="pi pi-shield"
                  severity="secondary"
                  [outlined]="true"
                  [disabled]="!puedeVerificar()"
                  (onClick)="marcarVerificado()" />
                @if (faltaParaVerificar()) {
                  <span class="text-xs text-surface-500">
                    <i class="pi pi-info-circle mr-1"></i>{{ faltaParaVerificar() }}
                  </span>
                }
              </div>
            }

            <div class="pt-1">
              <p-button
                label="Corregir datos"
                icon="pi pi-pencil"
                severity="secondary"
                [outlined]="true"
                (onClick)="startEdit()" />
            </div>
          </div>
        } @else {
          <div class="rounded border p-4 space-y-3">
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
                <input pInputText type="date" [(ngModel)]="form.birthDate" class="w-full" />
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
              <div class="sm:col-span-2">
                <label class="block text-sm mb-1">Cobertura</label>
                <p-select
                  [(ngModel)]="form.planId"
                  [options]="planOptions()"
                  optionLabel="label"
                  optionValue="planId"
                  placeholder="— Seleccioná —"
                  appendTo="body"
                  class="w-full" />
              </div>
              <div>
                <label class="block text-sm mb-1">Número de afiliado</label>
                <input pInputText [(ngModel)]="form.memberNumber" class="w-full" placeholder="Opcional" />
              </div>
            </div>
            <div class="flex justify-end">
              <p-button label="Guardar cambios" icon="pi pi-check" (onClick)="saveEdit()" />
            </div>
          </div>
        }
      }

      <!-- Caso B: DNI no existe → alta mínima inline -->
      @if (notFoundDni() && !resolved()) {
        <div class="rounded border p-4 space-y-3">
          <div class="text-sm text-surface-600">
            <i class="pi pi-info-circle mr-1"></i>
            No encontramos un paciente con DNI <b>{{ notFoundDni() }}</b>. Completá los datos para darlo de alta:
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm mb-1">DNI <span class="text-red-500">*</span></label>
              <input pInputText [(ngModel)]="form.dni" class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Nombre <span class="text-red-500">*</span></label>
              <input pInputText [(ngModel)]="form.firstName" class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Apellido <span class="text-red-500">*</span></label>
              <input pInputText [(ngModel)]="form.lastName" class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Fecha de nacimiento</label>
              <input pInputText type="date" [(ngModel)]="form.birthDate" class="w-full" />
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
            <div class="sm:col-span-2">
              <label class="block text-sm mb-1">Cobertura</label>
              <p-select
                [(ngModel)]="form.planId"
                [options]="planOptions()"
                optionLabel="label"
                optionValue="planId"
                placeholder="— Seleccioná —"
                appendTo="body"
                class="w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Número de afiliado</label>
              <input pInputText [(ngModel)]="form.memberNumber" class="w-full" placeholder="Opcional" />
            </div>
          </div>
          <div class="flex justify-end">
            <p-button
              label="Crear paciente"
              icon="pi pi-user-plus"
              [disabled]="!altaValida()"
              (onClick)="crearPaciente()" />
          </div>
        </div>
      }

      <!-- Indicaciones + confirmar -->
      <div>
        <label class="block text-sm font-medium mb-1">Indicaciones</label>
        <input pInputText [(ngModel)]="indications" class="w-full" placeholder="Ej: Ayuno 8 hs" />
      </div>

      <div class="flex justify-between items-center mt-4">
        <p-button label="Volver fase" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
                  [disabled]="returnDisabled() || !canReturn()" (onClick)="returnPhase.emit()" />
        <p-button
          label="Confirmar y seguir"
          icon="pi pi-arrow-right"
          [disabled]="!canConfirm()"
          (onClick)="onConfirm()" />
      </div>

    </div>
  `,
  styles: [`
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
  `],
})
export class DatosGeneralesStepComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly coveragePlans = inject(CoveragePlansService);
  private readonly route = inject(ActivatedRoute);

  readonly atencionId = input<number | null>(null);
  readonly initialDni = input<string | null>(null);

  /**
   * Footer "Volver fase" — el wizard provee el estado y bindea el handler.
   * En el paso datos (paso 1) y en el modo "creating", canReturn es false,
   * así que el botón queda visible pero deshabilitado, alineado a la izquierda.
   */
  readonly canReturn      = input<boolean>(false);
  readonly returnDisabled = input<boolean>(false);
  readonly returnPhase    = output<void>();

  protected readonly resolved        = this.store.selectSignal(selectResolvedPatient);
  protected readonly resolving        = this.store.selectSignal(selectPatientResolving);
  protected readonly notFoundDni      = this.store.selectSignal(selectPatientNotFoundDni);
  protected readonly resolutionError  = this.store.selectSignal(selectPatientResolutionError);

  protected readonly editing = signal(false);
  protected readonly planOptions = signal<CoveragePlanOption[]>([]);

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

  // ── 3-state badge ──────────────────────────────────────────────────────────
  protected readonly estado = computed<'rojo' | 'naranja' | 'verde'>(() => {
    if (this.notFoundDni()) return 'rojo';
    const p = this.resolved();
    if (!p) return 'rojo';
    return p.verifiedAt ? 'verde' : 'naranja';
  });

  // ── Portal tilde ───────────────────────────────────────────────────────────
  protected readonly esPortal = computed(() => this.resolved()?.source === 'PORTAL');

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
    effect(() => {
      const dni = this.notFoundDni();
      if (dni && !this.form.dni) {
        this.form.dni = dni;
      }
    });
  }

  ngOnInit(): void {
    // Load coverage plans for dropdowns (errors are swallowed — dropdown stays empty)
    this.coveragePlans.getActivePlans().pipe(
      catchError(() => EMPTY),
    ).subscribe(plans => {
      this.planOptions.set(plans);
      // Default-select the Particular plan if present
      const particular = plans.find(p => p.particular);
      if (particular && this.form.planId == null) {
        this.form.planId = particular.planId;
      }
    });

    const dni = this.initialDni();
    if (dni) {
      this.dniInput = dni;
      this.store.dispatch(resolvePatientByDni({ dni }));
    }
  }

  protected readonly canConfirm = computed(() => this.resolved() != null && !this.resolving());

  buscar(): void {
    const dni = this.dniInput.trim();
    if (dni) {
      this.store.dispatch(resolvePatientByDni({ dni }));
    }
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
    this.editing.set(true);
  }

  saveEdit(): void {
    const p = this.resolved();
    if (!p) return;
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
    return !!(f.dni && f.firstName && f.lastName);
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

  onConfirm(): void {
    const p = this.resolved();
    if (!p) return;
    const id = this.atencionId();
    if (id == null) {
      const qid = this.route.snapshot.queryParamMap.get('queueEntryId');
      const queueEntryId = qid ? Number(qid) : null;
      this.store.dispatch(
        startAttentionForPatient({
          patientId:   p.id,
          indications: this.indications || null,
          queueEntryId,
        }),
      );
      return;
    }
    this.store.dispatch(
      assignGeneralData({
        id,
        payload: {
          patientId:       p.id,
          doctorId:        null,
          insurancePlanId: null,
          indications:     this.indications || null,
        },
      }),
    );
  }
}
