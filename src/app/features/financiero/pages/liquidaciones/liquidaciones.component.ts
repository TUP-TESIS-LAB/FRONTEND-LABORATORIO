import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-liquidaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Liquidaciones</h2><ui-empty-state heading="Liquidaciones" icon="pi-file-pdf" />`,
})
export class LiquidacionesComponent {}
