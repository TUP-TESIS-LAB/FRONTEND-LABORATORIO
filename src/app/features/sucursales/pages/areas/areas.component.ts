import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadAreas } from '../../store/sucursales.actions';
import { selectAllAreas, selectSucursalesPending } from '../../store/sucursales.selectors';

@Component({
  selector: 'app-areas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando áreas...</p>
    } @else {
      @if (areas().length === 0) {
        <ui-empty-state heading="Sin áreas" icon="pi-th-large"
                        description="Configurá las áreas de trabajo de cada sucursal." ctaLabel="Nueva área" />
      } @else {
        <h2>Áreas</h2>
        <ul>
          @for (a of areas(); track a.id) {
            <li>{{ a.nombre }}</li>
          }
        </ul>
      }
    }
  `,
})
export class AreasComponent implements OnInit {
  private readonly store = inject(Store);

  readonly areas = this.store.selectSignal(selectAllAreas);
  readonly pending = this.store.selectSignal(selectSucursalesPending);

  ngOnInit(): void {
    this.store.dispatch(loadAreas({ sucursalId: 'default' }));
  }
}
