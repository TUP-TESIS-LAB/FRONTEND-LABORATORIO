import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-home"
      heading="Inicio"
      description="El dashboard de la página de inicio se construye en una próxima iteración." />
  `,
})
export class HomePage {}
