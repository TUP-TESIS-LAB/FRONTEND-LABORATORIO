import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadTurnos } from '../../store/turnos.actions';
import { selectAllTurnos, selectTurnosPending } from '../../store/turnos.selectors';

@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando turnos...</p>
    } @else if (turnos().length === 0) {
      <h2>Agenda de Turnos</h2>
      <ui-empty-state heading="Sin turnos para hoy" icon="pi-calendar" ctaLabel="Nuevo turno" />
    } @else {
      <h2>Agenda de Turnos</h2>
      <ul>
        @for (turno of turnos(); track turno.id) {
          <li>{{ turno.hora }} — {{ turno.estado }}</li>
        }
      </ul>
    }
  `,
})
export class AgendaComponent implements OnInit {
  private readonly store = inject(Store);

  readonly turnos = this.store.selectSignal(selectAllTurnos);
  readonly pending = this.store.selectSignal(selectTurnosPending);

  ngOnInit(): void {
    const fecha = new Date().toISOString().split('T')[0];
    this.store.dispatch(loadTurnos({ fecha }));
  }
}
