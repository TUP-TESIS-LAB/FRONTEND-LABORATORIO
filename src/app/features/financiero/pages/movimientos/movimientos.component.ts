import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Ingresos y Egresos</h2><ui-empty-state heading="Ingresos y Egresos" icon="pi-arrows-h" />`,
})
export class MovimientosComponent {}
