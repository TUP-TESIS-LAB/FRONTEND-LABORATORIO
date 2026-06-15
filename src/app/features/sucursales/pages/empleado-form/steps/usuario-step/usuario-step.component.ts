import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, retry } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SeccionesChecklistComponent } from '@features/roles-permisos/components/secciones-checklist.component';
import { RolesApiService } from '@features/empresa/services/roles-api.service';
import { RolesPermisosApiService } from '@features/roles-permisos/services/roles-permisos-api.service';
import { UsuariosApiService } from '@features/empresa/services/usuarios-api.service';
import { Rol } from '@features/empresa/models/rol.model';
import { Usuario } from '@features/empresa/models/usuario.model';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { Sucursal } from '@features/sucursales/models/sucursal.model';
import { AccessSection, SectionResponse } from '@core/access/access.model';

interface UserOption { id: number; label: string; }

/**
 * Paso "Usuario" del alta de empleado. Permite no asociar usuario, vincular uno existente,
 * o crear uno nuevo (con roles + secciones de acceso). El `mode` se recibe como input para
 * que el @switch sea reactivo bajo OnPush (lo deriva el parent desde el value del form).
 */
@Component({
  selector: 'emp-usuario-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select, SeccionesChecklistComponent],
  template: `
    <div [formGroup]="group()" class="max-w-2xl flex flex-col gap-4">
      @if (isEdit()) {
        @if (currentUserId()) {
          @if (linkedUser(); as u) {
            <section class="pat-form__card">
              <div class="pat-form__card-header"><span>Usuario vinculado</span></div>
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt class="text-surface-400 text-xs">Nombre</dt><dd>{{ u.firstName }} {{ u.lastName }}</dd></div>
                <div><dt class="text-surface-400 text-xs">Usuario</dt><dd>{{ u.username }}</dd></div>
                <div><dt class="text-surface-400 text-xs">Email</dt><dd>{{ u.email }}</dd></div>
                <div><dt class="text-surface-400 text-xs">Documento</dt><dd>{{ u.document || '—' }}</dd></div>
                <div><dt class="text-surface-400 text-xs">Rol</dt><dd>{{ rolName() }}</dd></div>
                <div><dt class="text-surface-400 text-xs">Sucursal</dt><dd>{{ branchName() }}</dd></div>
              </dl>
            </section>
          } @else {
            <p class="text-sm text-surface-400">Cargando datos del usuario…</p>
          }
          <p class="text-xs text-surface-400">
            La sucursal, el rol y los accesos del usuario se editan en <strong>Empresa › Usuarios</strong>.
          </p>
        } @else {
          <p class="text-sm text-surface-600">Este empleado no tiene un usuario vinculado.
            <span class="block text-xs text-surface-400 mt-1">La vinculación o creación de usuario se hace en el alta.</span>
          </p>
        }
      } @else {
        <p class="text-sm text-surface-500">¿Asociar un usuario del sistema a este empleado?</p>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 text-sm">
            <input type="radio" formControlName="mode" value="none" /> Sin usuario
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="radio" formControlName="mode" value="existing" /> Vincular un usuario existente
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="radio" formControlName="mode" value="new" /> Crear un usuario nuevo
          </label>
        </div>

        @switch (mode()) {
          @case ('existing') {
            <label class="flex flex-col gap-1 max-w-md">
              <span class="text-sm font-medium">Usuario <span class="pat-form__req">*</span></span>
              <p-select formControlName="existingUserId" [options]="users()" [filter]="true"
                        optionLabel="label" optionValue="id" />
            </label>
          }
          @case ('new') {
            <div formGroupName="newUser" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Nombre <span class="pat-form__req">*</span></span>
                <input pInputText formControlName="firstName" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Apellido <span class="pat-form__req">*</span></span>
                <input pInputText formControlName="lastName" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Email <span class="pat-form__req">*</span></span>
                <input pInputText type="email" formControlName="email" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Usuario (username) <span class="pat-form__req">*</span></span>
                <input pInputText formControlName="username" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Documento <span class="pat-form__req">*</span></span>
                <input pInputText formControlName="document" autocomplete="off" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Rol</span>
                <p-select formControlName="roleId" [options]="roles()" [showClear]="true"
                          optionLabel="description" optionValue="id" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium">Sucursal <span class="pat-form__req">*</span></span>
                <p-select formControlName="branchId" [options]="branches()"
                          optionLabel="description" optionValue="id" placeholder="Seleccioná una sucursal" />
                <span class="text-xs text-surface-400">El usuario opera en una sola sucursal.</span>
              </label>
            </div>
            <div class="mt-2">
              <h4 class="text-sm font-semibold mb-2">Permisos (secciones)</h4>
              <rp-secciones-checklist
                [catalog]="catalog()" [workingSet]="workingSet()" (toggle)="onToggleSection($event)" />
            </div>
            <p class="text-xs text-surface-400">
              El usuario se crea sin contraseña; recibe un acceso de primer login para definirla.
            </p>
          }
        }
      }
    </div>
  `,
})
export class UsuarioStepComponent {
  readonly group = input.required<FormGroup>();
  readonly mode = input<string>('none');
  readonly isEdit = input(false);
  readonly currentUserId = input<number | null>(null);
  /** Datos del empleado para precargar el usuario nuevo (NO email). */
  readonly identity = input<{ firstName: string; lastName: string; document: string }>(
    { firstName: '', lastName: '', document: '' });

  private readonly rolesApi = inject(RolesApiService);
  private readonly sectionsApi = inject(RolesPermisosApiService);
  private readonly usersApi = inject(UsuariosApiService);
  private readonly sucursalService = inject(SucursalService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = signal<Rol[]>([]);
  readonly catalog = signal<SectionResponse[]>([]);
  readonly users = signal<UserOption[]>([]);
  readonly branches = signal<Sucursal[]>([]);

  /** Datos del usuario vinculado (edición), para mostrarlos en vez del #id. */
  readonly linkedUser = signal<Usuario | null>(null);
  readonly rolName = computed(() => this.linkedUser()?.roles?.[0]?.description ?? '—');
  readonly branchName = computed(() => {
    const branchId = this.linkedUser()?.branch ?? null;
    if (branchId == null) return 'Sin sucursal';
    return this.branches().find((b) => b.id === branchId)?.description ?? `#${branchId}`;
  });

  constructor() {
    // Carga robusta: 1 reintento y, si falla, aviso al usuario (antes quedaba el
    // dropdown de Rol silenciosamente vacío sin ninguna pista del error).
    this.rolesApi.list().pipe(
      retry(1),
      catchError(() => { this.notification.error('No se pudieron cargar los roles. Reintentá en unos segundos.'); return of([] as Rol[]); }),
      takeUntilDestroyed(),
    ).subscribe((r) => this.roles.set(r));
    this.sectionsApi.getGrantable().pipe(
      retry(1),
      catchError(() => { this.notification.error('No se pudieron cargar las secciones de permisos.'); return of([] as SectionResponse[]); }),
      takeUntilDestroyed(),
    ).subscribe((c) => this.catalog.set(c));
    this.usersApi.search({ size: 100 }).pipe(takeUntilDestroyed()).subscribe((page) =>
      this.users.set(page.content.map((u) => ({ id: u.id, label: `${u.lastName}, ${u.firstName} (${u.username})` }))));
    this.sucursalService.list().pipe(takeUntilDestroyed()).subscribe((res) =>
      this.branches.set(res.content.filter((s) => s.active)));

    // En edición: trae los datos del usuario vinculado para mostrarlos (en vez del #id).
    let lastFetched: number | null = null;
    effect(() => {
      const uid = this.currentUserId();
      if (!this.isEdit() || uid == null) { return; }
      if (lastFetched === uid) return;
      lastFetched = uid;
      this.usersApi.getById(uid).pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((u) => this.linkedUser.set(u));
    });

    // Precarga nombre/apellido/documento del empleado al crear usuario nuevo. Solo pisa
    // controles `pristine` (no tocados manualmente); el email NO se precarga (puede ser otro).
    effect(() => {
      const id = this.identity();
      if (this.mode() !== 'new') return;
      const nu = this.group().get('newUser') as FormGroup;
      this.patchIfPristine(nu.get('firstName'), id.firstName);
      this.patchIfPristine(nu.get('lastName'), id.lastName);
      this.patchIfPristine(nu.get('document'), id.document);
    });
  }

  private patchIfPristine(control: AbstractControl | null, value: string): void {
    if (control && control.pristine) {
      control.setValue(value, { emitEvent: false });
    }
  }

  private sectionsControl() { return this.group().get('sections')!; }
  workingSet(): AccessSection[] { return (this.sectionsControl().value as AccessSection[]) ?? []; }

  onToggleSection(code: AccessSection): void {
    const cur = this.workingSet();
    const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
    this.sectionsControl().setValue(next);
    this.sectionsControl().markAsDirty();
  }
}
