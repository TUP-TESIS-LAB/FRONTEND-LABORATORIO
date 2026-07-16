import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { loadProtocolos } from '../../store/analitica.actions';
import { selectAllProtocolos, selectAnaliticaPending } from '../../store/analitica.selectors';

@Component({
  selector: 'app-protocolos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageHeaderComponent],
  template: `
    <ui-page-header heading="Protocolos" />
    @if (pending()) {
      <p>Cargando...</p>
    } @else if (protocolos().length === 0) {
      <ui-empty-state heading="Sin protocolos" icon="pi-file" />
    } @else {
      <ul>
        @for (item of protocolos(); track item.id) {
          <li>{{ item.numero }} — {{ item.estado }}</li>
        }
      </ul>
    }
  `,
})
export class ProtocolosComponent implements OnInit {
  private readonly store = inject(Store);

  readonly protocolos = this.store.selectSignal(selectAllProtocolos);
  readonly pending = this.store.selectSignal(selectAnaliticaPending);

  ngOnInit(): void {
    this.store.dispatch(loadProtocolos());
  }
}
