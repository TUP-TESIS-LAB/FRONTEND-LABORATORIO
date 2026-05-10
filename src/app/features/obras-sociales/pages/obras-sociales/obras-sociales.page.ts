import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-obras-sociales-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-id-card"
      heading="Obras Sociales"
      description="La gestión de obras sociales y coberturas se construye en una próxima iteración." />
  `,
})
export class ObrasSocialesPage {}
