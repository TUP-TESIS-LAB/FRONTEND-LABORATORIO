import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';

import { loadUsuarios } from '@features/empresa/store/empresa.actions';
import { selectAllUsuarios } from '@features/empresa/store/empresa.selectors';

import { UsuariosPickerComponent } from '../components/usuarios-picker.component';
import { SeccionesChecklistComponent } from '../components/secciones-checklist.component';
import { loadCatalog, selectUser, toggleSection, saveUserSections } from '../store/roles-permisos.actions';
import {
  selectCatalog, selectSelectedUserId, selectWorkingSet, selectIsDirty, selectRpSaving,
} from '../store/roles-permisos.selectors';
import { AccessSection } from '@core/access/access.model';

@Component({
  selector: 'rp-page',
  standalone: true,
  imports: [ButtonModule, UsuariosPickerComponent, SeccionesChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp-header">
      <div>
        <h2 class="rp-title">Roles y permisos</h2>
        <small class="ui-text-muted">Elegí un usuario y marcá a qué secciones tiene acceso.</small>
      </div>
      <p-button label="Guardar" icon="pi pi-check" severity="primary"
        [disabled]="!isDirty() || selectedUserId() === null || saving()"
        [loading]="saving()"
        (onClick)="save()" />
    </div>

    <div class="rp-grid">
      <aside class="rp-grid__master">
        <rp-usuarios-picker [usuarios]="usuarios()" [selectedId]="selectedUserId()" (select)="onSelect($event)" />
      </aside>
      <section class="rp-grid__detail">
        @if (selectedUserId() === null) {
          <div class="ui-empty-state">
            <i class="pi pi-user"></i>
            <h4>Elegí un usuario</h4>
            <p>Seleccioná un usuario de la izquierda para ver y editar sus accesos.</p>
          </div>
        } @else {
          <rp-secciones-checklist [catalog]="catalog()" [workingSet]="workingSet()" (toggle)="onToggle($event)" />
        }
      </section>
    </div>
  `,
  styles: [`
    .rp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
    .rp-title { margin: 0; }
    .rp-grid { display: grid; grid-template-columns: 320px 1fr; gap: var(--space-4); }
    @media (max-width: 768px) { .rp-grid { grid-template-columns: 1fr; } }
    .rp-grid__master, .rp-grid__detail { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding: var(--space-4); }
    .ui-text-muted { color: var(--ds-text-muted); }
    .ui-empty-state { padding: var(--space-8); text-align:center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class RolesPermisosPage implements OnInit {
  private readonly store = inject(Store);

  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly catalog = this.store.selectSignal(selectCatalog);
  readonly selectedUserId = this.store.selectSignal(selectSelectedUserId);
  readonly workingSet = this.store.selectSignal(selectWorkingSet);
  readonly isDirty = this.store.selectSignal(selectIsDirty);
  readonly saving = this.store.selectSignal(selectRpSaving);

  ngOnInit(): void {
    this.store.dispatch(loadUsuarios({ filters: { page: 0, size: 200, isActive: true } }));
    this.store.dispatch(loadCatalog());
  }

  onSelect(userId: number): void { this.store.dispatch(selectUser({ userId })); }
  onToggle(code: AccessSection): void { this.store.dispatch(toggleSection({ code })); }
  save(): void { this.store.dispatch(saveUserSections()); }
}
