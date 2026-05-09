import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Sucursales</h2>
    <ui-empty-state heading="Sin sucursales" icon="pi-map-marker"
                    description="Agregá la primera sucursal para empezar." ctaLabel="Nueva sucursal" />
  `,
})
export class SucursalesPageComponent {}
