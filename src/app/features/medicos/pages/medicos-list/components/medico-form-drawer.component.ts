import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CreateDoctorRequest, RegistrationType } from '../../../models/doctor.model';

interface RegistrationOption { label: string; value: RegistrationType; }

/**
 * Drawer de alta rápida REPETIBLE de médicos derivantes (patrón usuario-form-drawer).
 * Campos esenciales (sin firma — la firma se edita en el alta/edición individual).
 * "Guardar y agregar otro" persiste y deja el drawer abierto limpio para cargar el
 * siguiente; "Guardar" persiste y cierra. El reset post-éxito lo dispara el parent
 * incrementando `resetToken` (sólo limpia si el guardado fue exitoso).
 */
@Component({
  selector: 'med-medico-form-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      header="Nuevo médico derivante">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Datos del médico</span></div>
            <div class="pat-form__grid">
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="firstName" class="pat-form__input" autocomplete="off" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Apellido*</label>
                <input pInputText formControlName="lastName" class="pat-form__input" autocomplete="off" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Matrícula*</label>
                <input pInputText formControlName="tuition" class="pat-form__input" autocomplete="off" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Tipo de registro*</label>
                <p-select
                  [options]="registrationTypes"
                  optionLabel="label"
                  optionValue="value"
                  formControlName="registrationType"
                  appendTo="body"
                  class="w-full" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Especialidad</label>
                <input pInputText formControlName="specialty" class="pat-form__input" autocomplete="off" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Email</label>
                <input pInputText type="email" formControlName="email" class="pat-form__input" autocomplete="off" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Teléfono</label>
                <input pInputText formControlName="phone" class="pat-form__input" autocomplete="off" />
              </div>
            </div>
          </section>
        </div>

        <div class="pat-form__footer">
          <p-button label="Cancelar" severity="secondary" text type="button" (onClick)="cancel.emit()" />
          <p-button label="Guardar y agregar otro" severity="secondary" [outlined]="true" type="button"
                    [disabled]="!canSubmit() || saving" [loading]="saving" (onClick)="onSubmitNext()" />
          <p-button label="Guardar" severity="primary" type="submit"
                    [disabled]="!canSubmit() || saving" [loading]="saving" />
        </div>
      </form>
    </p-drawer>
  `,
})
export class MedicoFormDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() saving = false;
  /** Cada incremento (post-éxito de "agregar otro") limpia el form dejando el drawer abierto. */
  @Input() resetToken = 0;

  @Output() create = new EventEmitter<CreateDoctorRequest>();
  @Output() createAndNext = new EventEmitter<CreateDoctorRequest>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;

  readonly registrationTypes: RegistrationOption[] = [
    { label: 'Nacional', value: 'NACIONAL' },
    { label: 'Provincial', value: 'PROVINCIAL' },
  ];

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    tuition: ['', [Validators.required]],
    registrationType: ['NACIONAL' as RegistrationType, [Validators.required]],
    specialty: [''],
    email: ['', [Validators.email]],
    phone: [''],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');

  private wasVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) this.resetForm();
      this.wasVisible = this.visible;
    }
    if ('resetToken' in changes && !changes['resetToken'].firstChange) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.form.reset({
      firstName: '', lastName: '', tuition: '', registrationType: 'NACIONAL',
      specialty: '', email: '', phone: '',
    });
  }

  private buildRequest(): CreateDoctorRequest {
    const raw = this.form.getRawValue();
    return {
      firstName: raw.firstName!.trim(),
      lastName: raw.lastName!.trim(),
      tuition: raw.tuition!.trim(),
      registrationType: raw.registrationType!,
      specialty: raw.specialty?.trim() || null,
      email: raw.email?.trim() || null,
      phone: raw.phone?.trim() || null,
    };
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.create.emit(this.buildRequest());
  }

  onSubmitNext(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.createAndNext.emit(this.buildRequest());
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }
}
