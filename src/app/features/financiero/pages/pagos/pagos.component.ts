import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pagos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Pagos</h2><ui-empty-state heading="Sin pagos registrados" icon="pi-credit-card" ctaLabel="Registrar pago" />`,
})
export class PagosComponent {}
