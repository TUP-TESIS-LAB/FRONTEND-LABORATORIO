import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Rol } from '../../../models/rol.model';
import { ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuario-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, MultiSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      [header]="editing() ? 'Editar usuario' : 'Invitar usuario'">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-user" style="margin-right:6px"></i>Datos del usuario</span>
            </div>
            <div class="pat-form__grid">
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="firstName" class="pat-form__input" placeholder="María" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Apellido*</label>
                <input pInputText formControlName="lastName" class="pat-form__input" placeholder="García" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Email*</label>
                <input pInputText type="email" formControlName="email" class="pat-form__input" placeholder="maria@laboratorio.com" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Documento*</label>
                <input pInputText formControlName="document" class="pat-form__input" placeholder="32456789" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Usuario*</label>
                <input pInputText formControlName="username" class="pat-form__input" placeholder="mgarcia" />
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-id-card" style="margin-right:6px"></i>Roles</span>
            </div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Asignar roles*</label>
                <p-multiSelect
                  [options]="roles"
                  optionLabel="description"
                  optionValue="id"
                  formControlName="roleIds"
                  display="chip"
                  appendTo="body"
                  class="w-full"
                  placeholder="Seleccionar uno o más roles" />
              </div>
            </div>
          </section>
        </div>

        <div class="pat-form__footer">
          <p-button label="Cancelar" severity="secondary" text type="button" (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar' : 'Invitar'"
            severity="primary"
            type="submit"
            [disabled]="!canSubmit() || saving"
            [loading]="saving" />
        </div>
      </form>
    </p-drawer>
  `,
})
export class UsuarioFormDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input({ required: true }) roles!: Rol[];
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() create = new EventEmitter<CrearUsuarioPayload>();
  @Output() update = new EventEmitter<{ id: number; payload: ActualizarUsuarioPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    document: ['', [Validators.required]],
    username: ['', [Validators.required]],
    roleIds: [[] as number[], [Validators.required]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');
  readonly editing = computed(() => !!this.usuario);

  private wasVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) {
        if (this.usuario) {
          this.form.reset({
            firstName: this.usuario.firstName,
            lastName: this.usuario.lastName,
            email: this.usuario.email,
            document: this.usuario.document,
            username: this.usuario.username,
            roleIds: this.usuario.roles.map((r) => r.id),
          });
        } else {
          this.form.reset({ firstName: '', lastName: '', email: '', document: '', username: '', roleIds: [] });
        }
      }
      this.wasVisible = this.visible;
    }
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const payload = this.form.getRawValue() as CrearUsuarioPayload;
    if (this.usuario) {
      this.update.emit({ id: this.usuario.id, payload });
    } else {
      this.create.emit(payload);
    }
  }
}
