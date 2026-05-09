import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-analitica-work',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Analítica</h2><ui-empty-state heading="Sin trabajo analítico" icon="pi-cog" />`,
})
export class AnaliticaWorkComponent {}
