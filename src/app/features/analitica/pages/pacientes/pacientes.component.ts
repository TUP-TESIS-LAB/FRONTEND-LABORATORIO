import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadPacientes } from '../../store/analitica.actions';
import { selectAllPacientes, selectAnaliticaPending } from '../../store/analitica.selectors';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando...</p>
    } @else if (pacientes().length === 0) {
      <h2>Pacientes</h2>
      <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" />
    } @else {
      <h2>Pacientes</h2>
      <ul>
        @for (item of pacientes(); track item.id) {
          <li>{{ item.apellido }}, {{ item.nombre }}</li>
        }
      </ul>
    }
  `,
})
export class PacientesComponent implements OnInit {
  private readonly store = inject(Store);

  readonly pacientes = this.store.selectSignal(selectAllPacientes);
  readonly pending = this.store.selectSignal(selectAnaliticaPending);

  ngOnInit(): void {
    this.store.dispatch(loadPacientes());
  }
}
