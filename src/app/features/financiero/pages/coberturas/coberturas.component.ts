import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadCoberturas } from '../../store/financiero.actions';
import { selectAllCoberturas } from '../../store/financiero.selectors';

@Component({
  selector: 'app-coberturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Coberturas</h2>
    @if (coberturas().length === 0) {
      <ui-empty-state heading="Coberturas" icon="pi-shield" />
    } @else {
      @for (cobertura of coberturas(); track cobertura.id) {
        <div>{{ cobertura.nombre }}</div>
      }
    }
  `,
})
export class CoberturasComponent implements OnInit {
  private readonly store = inject(Store);

  readonly coberturas = this.store.selectSignal(selectAllCoberturas);

  ngOnInit(): void {
    this.store.dispatch(loadCoberturas());
  }
}
