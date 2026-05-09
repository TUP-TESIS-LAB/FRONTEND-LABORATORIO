import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadProtocolos } from '../../store/analitica.actions';
import { selectAllProtocolos, selectAnaliticaPending } from '../../store/analitica.selectors';

@Component({
  selector: 'app-analitica-work',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando...</p>
    } @else if (protocolos().length === 0) {
      <h2>Analítica</h2>
      <ui-empty-state heading="Sin trabajo analítico" icon="pi-cog" />
    } @else {
      <h2>Analítica</h2>
      <ul>
        @for (item of protocolos(); track item.id) {
          <li>{{ item.numero }} — {{ item.estado }}</li>
        }
      </ul>
    }
  `,
})
export class AnaliticaWorkComponent implements OnInit {
  private readonly store = inject(Store);

  readonly protocolos = this.store.selectSignal(selectAllProtocolos);
  readonly pending = this.store.selectSignal(selectAnaliticaPending);

  ngOnInit(): void {
    this.store.dispatch(loadProtocolos());
  }
}
