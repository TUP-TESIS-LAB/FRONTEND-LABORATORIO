import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadPagos } from '../../store/financiero.actions';
import { selectAllPagos, selectFinancieroPending } from '../../store/financiero.selectors';

@Component({
  selector: 'app-pagos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Pagos</h2>
    @if (pending()) {
      <p>Cargando...</p>
    } @else if (pagos().length === 0) {
      <ui-empty-state heading="Sin pagos registrados" icon="pi-credit-card" ctaLabel="Registrar pago" />
    } @else {
      @for (pago of pagos(); track pago.id) {
        <div>{{ pago.monto }} - {{ pago.fecha }}</div>
      }
    }
  `,
})
export class PagosComponent implements OnInit {
  private readonly store = inject(Store);

  readonly pagos = this.store.selectSignal(selectAllPagos);
  readonly pending = this.store.selectSignal(selectFinancieroPending);

  ngOnInit(): void {
    this.store.dispatch(loadPagos());
  }
}
