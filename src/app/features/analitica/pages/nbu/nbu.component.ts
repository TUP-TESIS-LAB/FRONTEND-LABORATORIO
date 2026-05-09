import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadNbus } from '../../store/analitica.actions';
import { selectAllNbus, selectAnaliticaPending } from '../../store/analitica.selectors';

@Component({
  selector: 'app-nbu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando...</p>
    } @else if (nbus().length === 0) {
      <h2>NBU</h2>
      <ui-empty-state heading="Sin NBU configurados" icon="pi-list" />
    } @else {
      <h2>NBU</h2>
      <ul>
        @for (item of nbus(); track item.id) {
          <li>{{ item.codigo }} — {{ item.descripcion }}</li>
        }
      </ul>
    }
  `,
})
export class NbuComponent implements OnInit {
  private readonly store = inject(Store);

  readonly nbus = this.store.selectSignal(selectAllNbus);
  readonly pending = this.store.selectSignal(selectAnaliticaPending);

  ngOnInit(): void {
    this.store.dispatch(loadNbus());
  }
}
