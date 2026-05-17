import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';

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
import {
  ActualizarUsuarioPayload, BuscarUsuariosParams, CambiarEstadoPayload, CrearUsuarioPayload, Usuario,
} from '../../models/usuario.model';

import { UsuariosFiltrosComponent } from './components/usuarios-filtros.component';
import { UsuariosTableComponent } from './components/usuarios-table.component';
import { UsuarioFormDrawerComponent } from './components/usuario-form-drawer.component';
import { ToggleStatusDialogComponent } from './components/toggle-status-dialog.component';

@Component({
  selector: 'emp-usuarios-page',
  standalone: true,
  imports: [
    ButtonModule,
    UsuariosFiltrosComponent, UsuariosTableComponent,
    UsuarioFormDrawerComponent, ToggleStatusDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-usuarios__header">
      <div>
        <h2 class="emp-usuarios__title">Usuarios</h2>
        <small class="ui-text-muted">{{ totalElements() }} usuarios en total</small>
      </div>
      <p-button label="Invitar" icon="pi pi-plus" severity="primary" (onClick)="openCreate()" />
    </div>

    <emp-usuarios-filtros
      [filters]="filters()"
      [roles]="roles()"
      (patch)="onFiltersPatch($event)" />

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
    .emp-usuarios__header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-4);
    }
    .emp-usuarios__title { margin: 0; }
  `],
})
export class UsuariosPage implements OnInit {
  private readonly store = inject(Store);

  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly roles = this.store.selectSignal(selectAllRoles);
  readonly filters = this.store.selectSignal(selectUsuariosFilters);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly page = this.store.selectSignal(selectUsuariosPage);
  readonly size = this.store.selectSignal(selectUsuariosSize);
  readonly totalElements = this.store.selectSignal(selectUsuariosTotalElements);

  readonly formOpen = signal(false);
  readonly editingUser = signal<Usuario | null>(null);

  readonly toggleOpen = signal(false);
  readonly togglingUser = signal<Usuario | null>(null);

  ngOnInit(): void {
    this.store.dispatch(loadRoles());
    this.store.dispatch(loadUsuarios({ filters: this.filters() }));
  }

  onFiltersPatch(patch: Partial<BuscarUsuariosParams>): void {
    this.store.dispatch(setUsuariosFilters({ patch }));
  }
  onPageChange({ page, size }: { page: number; size: number }): void {
    this.store.dispatch(setUsuariosFilters({ patch: { page, size } }));
  }

  openCreate(): void { this.editingUser.set(null); this.formOpen.set(true); }
  openEdit(u: Usuario): void { this.editingUser.set(u); this.formOpen.set(true); }
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
