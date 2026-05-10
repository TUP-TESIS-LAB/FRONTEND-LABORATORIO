import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadMovimientos } from '../../store/financiero.actions';
import { selectAllMovimientos } from '../../store/financiero.selectors';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Ingresos y Egresos</h2>
    @if (movimientos().length === 0) {
      <ui-empty-state heading="Ingresos y Egresos" icon="pi-arrows-h" />
    } @else {
      @for (mov of movimientos(); track mov.id) {
        <div>{{ mov.tipo }} - {{ mov.monto }} - {{ mov.descripcion }}</div>
      }
    }
  `,
})
export class MovimientosComponent implements OnInit {
  private readonly store = inject(Store);

  readonly movimientos = this.store.selectSignal(selectAllMovimientos);

  ngOnInit(): void {
    this.store.dispatch(loadMovimientos());
  }
}
