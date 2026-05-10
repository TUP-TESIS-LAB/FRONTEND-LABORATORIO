import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-post-analitica',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Post-Analítica</h2><ui-empty-state heading="Sin resultados en post-analítica" icon="pi-check-circle" />`,
})
export class PostAnaliticaComponent {}
