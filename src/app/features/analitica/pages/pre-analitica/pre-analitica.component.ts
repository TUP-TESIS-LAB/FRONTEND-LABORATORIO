import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pre-analitica',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Pre-Analítica</h2><ui-empty-state heading="Sin muestras en pre-analítica" icon="pi-inbox" />`,
})
export class PreAnaliticaComponent {}
