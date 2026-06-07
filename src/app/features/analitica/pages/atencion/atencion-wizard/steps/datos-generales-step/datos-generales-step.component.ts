import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Gender, SexAtBirth } from '@features/pacientes/models/patient.model';
import {
  assignGeneralData,
  createPatientInline,
  resolvePatientByDni,
  startAttentionForPatient,
  updatePatientInline,
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
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
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
          <div class="rounded border p-4 space-y-1 bg-surface-50">
            <div class="font-semibold text-base">{{ p.firstName }} {{ p.lastName }}</div>
            <div class="text-sm text-surface-600">DNI {{ p.dni }}</div>
            <div class="text-sm text-surface-500">Estado ficha: {{ p.status }}</div>
            <div class="pt-2">
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
              <label class="block text-sm mb-1">DNI</label>
              <input pInputText [(ngModel)]="form.dni" class="w-full" />
            </div>
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

      <div class="flex justify-end">
        <p-button
          label="Confirmar y seguir"
          icon="pi pi-arrow-right"
          [disabled]="!canConfirm()"
          (onClick)="onConfirm()" />
      </div>

    </div>
  `,
})
export class DatosGeneralesStepComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  readonly atencionId = input<number | null>(null);
  readonly initialDni = input<string | null>(null);

  protected readonly resolved        = this.store.selectSignal(selectResolvedPatient);
  protected readonly resolving        = this.store.selectSignal(selectPatientResolving);
  protected readonly notFoundDni      = this.store.selectSignal(selectPatientNotFoundDni);
  protected readonly resolutionError  = this.store.selectSignal(selectPatientResolutionError);

  protected readonly editing = signal(false);

  protected dniInput   = '';
  protected indications = '';
  // Alta form uses template-driven ngModel on a plain object; [disabled] on the button
  // re-evaluates via ngModelChange's markForCheck triggered by FormsModule under OnPush.
  protected form = {
    dni:        '',
    firstName:  '',
    lastName:   '',
    birthDate:  '',
    gender:     null as Gender | null,
    sexAtBirth: null as SexAtBirth | null,
  };

  protected readonly genderOpts = GENDER_OPTS;
  protected readonly sexOpts    = SEX_OPTS;

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
    this.form = {
      dni:        p.dni,
      firstName:  p.firstName,
      lastName:   p.lastName,
      birthDate:  p.birthDate ?? '',
      gender:     p.gender,
      sexAtBirth: p.sexAtBirth,
    };
    this.editing.set(true);
  }

  saveEdit(): void {
    const p = this.resolved();
    if (!p) return;
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
          coverages:  p.coverages,
        },
      }),
    );
    this.editing.set(false);
  }

  altaValida(): boolean {
    const f = this.form;
    return !!(f.dni && f.firstName && f.lastName && f.birthDate && f.gender && f.sexAtBirth);
  }

  crearPaciente(): void {
    if (!this.altaValida()) return;
    const f = this.form;
    this.store.dispatch(
      createPatientInline({
        payload: {
          dni:        f.dni,
          firstName:  f.firstName,
          lastName:   f.lastName,
          birthDate:  f.birthDate,
          gender:     f.gender,
          sexAtBirth: f.sexAtBirth,
          contacts:   [],
          addresses:  [],
          coverages:  [],
        },
      }),
    );
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
