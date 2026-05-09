import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadUsuarios } from '../../store/empresa.actions';
import {
  selectAllUsuarios,
  selectEmpresaPending,
  selectEmpresaError,
} from '../../store/empresa.selectors';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="page-header">
      <h2>Usuarios</h2>
    </div>

    @if (pending()) {
      <p>Cargando...</p>
    } @else if (error()) {
      <p class="error">Error al cargar usuarios: {{ error()?.message }}</p>
    } @else if (usuarios().length === 0) {
      <ui-empty-state
        heading="Sin usuarios"
        icon="pi-users"
        description="Aún no hay usuarios registrados en el sistema."
        ctaLabel="Agregar usuario"
      />
    } @else {
      <ul class="usuarios-list">
        @for (u of usuarios(); track u.id) {
          <li class="usuario-item">
            <span class="nombre">{{ u.nombre }}</span>
            <span class="email">{{ u.email }}</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .page-header { margin-bottom: var(--space-6); }
    .error { color: var(--color-error, red); }
    .usuarios-list { list-style: none; padding: 0; margin: 0; }
    .usuario-item { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border, #eee); }
    .nombre { font-weight: 600; }
    .email { color: var(--color-text-secondary, #666); }
  `],
})
export class UsuariosComponent implements OnInit {
  private readonly store = inject(Store);

  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly error = this.store.selectSignal(selectEmpresaError);

  ngOnInit(): void {
    this.store.dispatch(loadUsuarios());
  }
}
