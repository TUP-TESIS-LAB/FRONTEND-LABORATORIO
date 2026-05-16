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
import { FloatLabelModule } from 'primeng/floatlabel';
import { Rol } from '../../../models/rol.model';
import { ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuario-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, MultiSelectModule, FloatLabelModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [(visible)]="visibleInternal"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      (onHide)="cancel.emit()">
      <ng-template pTemplate="header">
        <h3>{{ editing() ? 'Editar usuario' : 'Invitar usuario' }}</h3>
      </ng-template>

      <form [formGroup]="form" class="emp-form" (ngSubmit)="onSubmit()">
        <p-floatlabel>
          <input pInputText id="firstName" formControlName="firstName" />
          <label for="firstName">Nombre</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="lastName" formControlName="lastName" />
          <label for="lastName">Apellido</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="email" type="email" formControlName="email" />
          <label for="email">Email</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="document" formControlName="document" />
          <label for="document">Documento</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="username" formControlName="username" />
          <label for="username">Usuario</label>
        </p-floatlabel>
        <p-floatlabel>
          <p-multiSelect id="roleIds" [options]="roles"
            optionLabel="description" optionValue="id"
            formControlName="roleIds" display="chip" />
          <label for="roleIds">Roles</label>
        </p-floatlabel>
      </form>

      <ng-template pTemplate="footer">
        <div class="emp-form__footer">
          <p-button label="Cancelar" severity="secondary" text (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar' : 'Invitar'"
            severity="primary"
            [disabled]="!canSubmit() || saving"
            [loading]="saving"
            (onClick)="onSubmit()" />
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
    .emp-form { display: flex; flex-direction: column; gap: var(--space-5); padding-top: var(--space-3); }
    .emp-form__footer { display: flex; justify-content: flex-end; gap: var(--space-3); }
  `],
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
      // Reset/hydrate only on closed→open transition.
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
