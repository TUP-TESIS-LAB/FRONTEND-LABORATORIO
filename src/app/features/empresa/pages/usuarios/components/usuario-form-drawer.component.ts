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
import { Rol } from '../../../models/rol.model';
import { ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario } from '../../../models/usuario.model';
import { AccessSection, SectionResponse } from '@core/access/access.model';
import { SeccionesChecklistComponent } from '@features/roles-permisos/components/secciones-checklist.component';
import { presetForRole } from '../../../models/role-section-presets';

@Component({
  selector: 'emp-usuario-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule,
    SeccionesChecklistComponent,
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
              <span><i class="pi pi-id-card" style="margin-right:6px"></i>Rol</span>
            </div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Rol*</label>
                <p-select
                  [options]="roles"
                  optionLabel="description"
                  optionValue="id"
                  formControlName="roleId"
                  appendTo="body"
                  class="w-full"
                  placeholder="Elegí un rol"
                  (onChange)="onRoleChange($event.value)" />
                <small class="ui-text-muted">El rol pre-marca las secciones. Podés ajustarlas abajo.</small>
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-th-large" style="margin-right:6px"></i>Accesos (secciones)</span>
            </div>
            <rp-secciones-checklist
              [catalog]="catalog"
              [workingSet]="workingSet()"
              (toggle)="onToggleSection($event)" />
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
  @Input({ required: true }) catalog!: SectionResponse[];
  @Input() initialSections: AccessSection[] = [];
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() create = new EventEmitter<CrearUsuarioPayload>();
  @Output() update = new EventEmitter<{ id: number; payload: ActualizarUsuarioPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;
  readonly workingSet = signal<AccessSection[]>([]);

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    document: ['', [Validators.required]],
    username: ['', [Validators.required]],
    roleId: [null as number | null, [Validators.required]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');
  readonly editing = computed(() => !!this.usuario);

  private wasVisible = false;

  private grantableCodes(): AccessSection[] {
    return this.catalog.map((s) => s.code);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) {
        if (this.usuario) {
          const firstRoleId = this.usuario.roles[0]?.id ?? null;
          this.form.reset({
            firstName: this.usuario.firstName,
            lastName: this.usuario.lastName,
            email: this.usuario.email,
            document: this.usuario.document,
            username: this.usuario.username,
            roleId: firstRoleId,
          });
          this.workingSet.set([...this.initialSections]);
        } else {
          this.form.reset({ firstName: '', lastName: '', email: '', document: '', username: '', roleId: null });
          this.workingSet.set([]);
        }
      }
      this.wasVisible = this.visible;
    }
  }

  onRoleChange(roleId: number | null): void {
    this.form.patchValue({ roleId });
    const role = this.roles.find((r) => r.id === roleId);
    if (!role) { this.workingSet.set([]); return; }
    this.workingSet.set(presetForRole(role.code, this.grantableCodes()));
  }

  onToggleSection(code: AccessSection): void {
    const current = this.workingSet();
    this.workingSet.set(
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: CrearUsuarioPayload = {
      firstName: raw.firstName!,
      lastName: raw.lastName!,
      email: raw.email!,
      document: raw.document!,
      username: raw.username!,
      roleIds: raw.roleId != null ? [raw.roleId] : [],
      sections: this.workingSet(),
    };
    if (this.usuario) {
      this.update.emit({ id: this.usuario.id, payload });
    } else {
      this.create.emit(payload);
    }
  }
}
