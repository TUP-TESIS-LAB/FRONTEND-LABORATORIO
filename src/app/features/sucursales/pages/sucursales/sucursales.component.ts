import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { loadSucursales } from '../../store/sucursales.actions';
import { selectAllSucursales, selectSucursalesPending } from '../../store/sucursales.selectors';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (pending()) {
      <p>Cargando sucursales...</p>
    } @else {
      @if (sucursales().length === 0) {
        <ui-empty-state heading="Sin sucursales" icon="pi-map-marker"
                        description="Agregá la primera sucursal para empezar." ctaLabel="Nueva sucursal" />
      } @else {
        <h2>Sucursales</h2>
        <ul>
          @for (s of sucursales(); track s.id) {
            <li>{{ s.nombre }} — {{ s.direccion }}</li>
          }
        </ul>
      }
    }
  `,
})
export class SucursalesPageComponent implements OnInit {
  private readonly store = inject(Store);

  readonly sucursales = this.store.selectSignal(selectAllSucursales);
  readonly pending = this.store.selectSignal(selectSucursalesPending);

  ngOnInit(): void {
    this.store.dispatch(loadSucursales());
  }
}
