import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { FilterBarComponent, FilterBarConfig, FilterBarValue } from '@shared/ui/components/filter-bar/filter-bar.component';
import { UsuariosCreateBus } from './usuarios-create.bus';

import {
  loadUsuarios, setUsuariosFilters, loadRoles,
  addUsuario, updateUsuario,
  toggleUsuarioStatus,
  resendUsuarioInvite, regenerateFirstLoginToken,
} from '../../store/empresa.actions';
import {
  selectAllUsuarios, selectAllRoles,
  selectEmpresaPending, selectUsuariosFilters,
  selectUsuariosPage, selectUsuariosSize, selectUsuariosTotalElements,
} from '../../store/empresa.selectors';
import { loadCatalog, selectUser } from '@features/roles-permisos/store/roles-permisos.actions';
import { selectCatalog, selectRpPending, selectWorkingSet } from '@features/roles-permisos/store/roles-permisos.selectors';
import {
  ActualizarUsuarioPayload, BuscarUsuariosParams, CambiarEstadoPayload, CrearUsuarioPayload, Usuario,
} from '../../models/usuario.model';
import { Sucursal } from '@features/sucursales/models/sucursal.model';
import { SucursalService } from '@features/sucursales/services/sucursal.service';

import { UsuariosTableComponent } from './components/usuarios-table.component';
import { UsuarioFormDrawerComponent } from './components/usuario-form-drawer.component';
import { ToggleStatusDialogComponent } from './components/toggle-status-dialog.component';

@Component({
  selector: 'emp-usuarios-page',
  standalone: true,
  imports: [
    FilterBarComponent,
    UsuariosTableComponent,
    UsuarioFormDrawerComponent, ToggleStatusDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-usuarios__filters">
      <ui-filter-bar [config]="filterConfig()" (valueChange)="onFilterChange($event)" />
    </div>

    <emp-usuarios-table
      [usuarios]="usuarios()"
      [page]="page()"
      [size]="size()"
      [totalElements]="totalElements()"
      [loading]="pending()"
      (edit)="openEdit($event)"
      (toggleStatus)="openToggle($event)"
      (resendInvite)="onResend($event)"
      (regenerateToken)="onRegenerate($event)"
      (pageChange)="onPageChange($event)" />

    <emp-usuario-form-drawer
      [visible]="formOpen()"
      [usuario]="editingUser()"
      [roles]="roles()"
      [branches]="branches()"
      [catalog]="catalog()"
      [initialSections]="editingUser() ? editingSections() : []"
      [saving]="pending()"
      (create)="onCreate($event)"
      (update)="onUpdate($event)"
      (cancel)="closeForm()" />

    <emp-toggle-status-dialog
      [visible]="toggleOpen()"
      [usuario]="togglingUser()"
      [saving]="pending()"
      (confirm)="onConfirmToggle($event)"
      (cancel)="closeToggle()" />
  `,
  styles: [`
    .emp-usuarios__filters { margin-bottom: var(--space-4); }
  `],
})
export class UsuariosPage implements OnInit {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sucursalService = inject(SucursalService);
  private readonly createBus = inject(UsuariosCreateBus);

  readonly branches = signal<Sucursal[]>([]);
  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly roles = this.store.selectSignal(selectAllRoles);
  readonly filters = this.store.selectSignal(selectUsuariosFilters);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly page = this.store.selectSignal(selectUsuariosPage);
  readonly size = this.store.selectSignal(selectUsuariosSize);
  readonly totalElements = this.store.selectSignal(selectUsuariosTotalElements);
  readonly catalog = this.store.selectSignal(selectCatalog);
  readonly editingSections = this.store.selectSignal(selectWorkingSet);

  readonly formOpen = signal(false);
  readonly editingUser = signal<Usuario | null>(null);

  readonly toggleOpen = signal(false);
  readonly togglingUser = signal<Usuario | null>(null);

  // FilterBar estándar: búsqueda libre + rol (multi-select por id) + estado single-value
  // (activos/inactivos; sin selección = todos). Computed porque las opciones de rol vienen
  // del store.
  readonly filterConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar por nombre, email, documento…',
    selects: [
      {
        key: 'roleIds',
        label: 'Rol',
        options: this.roles().map((r) => ({ value: r.id, label: r.description })),
      },
      {
        key: 'estado',
        label: 'Estado',
        options: [
          { value: 'active', label: 'Activos' },
          { value: 'inactive', label: 'Inactivos' },
        ],
      },
    ],
  }));

  ngOnInit(): void {
    this.store.dispatch(loadRoles());
    this.store.dispatch(loadCatalog());
    this.store.dispatch(loadUsuarios({ filters: this.filters() }));

    // El botón "Nuevo usuario" vive en el header del dashboard (padre); abre el
    // drawer de alta acá vía el bus.
    this.createBus.create$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openCreate());

    // Sucursales del tenant para el selector del drawer (sólo activas).
    this.sucursalService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.branches.set(res.content.filter((s) => s.active)));
  }

  /**
   * Cableo del FilterBar estándar a la búsqueda de usuarios. Rol es multi-select (ids);
   * estado es single-value (sin selección = todos → isActive undefined). Resetea page a 0.
   */
  onFilterChange(value: FilterBarValue): void {
    const roleIds = (value['roleIds'] as number[]) ?? [];
    const estados = (value['estado'] as string[]) ?? [];
    const lastEstado = estados.length ? estados[estados.length - 1] : undefined;

    const patch: Partial<BuscarUsuariosParams> = {
      search: (value['search'] as string) || undefined,
      roleIds: roleIds.length ? roleIds : undefined,
      isActive: lastEstado === undefined ? undefined : lastEstado === 'active',
      page: 0,
    };
    this.store.dispatch(setUsuariosFilters({ patch }));
  }
  onPageChange({ page, size }: { page: number; size: number }): void {
    this.store.dispatch(setUsuariosFilters({ patch: { page, size } }));
  }

  openCreate(): void { this.editingUser.set(null); this.formOpen.set(true); }
  openEdit(u: Usuario): void {
    this.editingUser.set(u);
    this.store.dispatch(selectUser({ userId: u.id }));
    // Abrir el drawer recién cuando terminó de cargar las secciones del usuario,
    // para que el drawer tome las secciones correctas y no pise/borre nada.
    // takeUntilDestroyed + guard por id: si el usuario cancela o cambia de fila antes de
    // que `pending` sea false, la suscripción stale no abre el drawer del usuario equivocado.
    this.store.select(selectRpPending).pipe(
      filter((pending) => !pending),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      if (this.editingUser()?.id === u.id) this.formOpen.set(true);
    });
  }
  closeForm(): void { this.formOpen.set(false); this.editingUser.set(null); }

  onCreate(payload: CrearUsuarioPayload): void {
    this.store.dispatch(addUsuario({ payload }));
    this.closeForm();
  }
  onUpdate({ id, payload }: { id: number; payload: ActualizarUsuarioPayload }): void {
    this.store.dispatch(updateUsuario({ id, payload }));
    this.closeForm();
  }

  openToggle(u: Usuario): void { this.togglingUser.set(u); this.toggleOpen.set(true); }
  closeToggle(): void { this.toggleOpen.set(false); this.togglingUser.set(null); }
  onConfirmToggle({ id, payload }: { id: number; payload: CambiarEstadoPayload }): void {
    this.store.dispatch(toggleUsuarioStatus({ id, payload }));
    this.closeToggle();
  }

  onResend(u: Usuario): void { this.store.dispatch(resendUsuarioInvite({ userId: u.id })); }
  onRegenerate(u: Usuario): void { this.store.dispatch(regenerateFirstLoginToken({ userId: u.id })); }
}
