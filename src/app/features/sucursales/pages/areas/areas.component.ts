import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-areas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Áreas</h2>
    <ui-empty-state heading="Sin áreas" icon="pi-th-large"
                    description="Configurá las áreas de trabajo de cada sucursal." ctaLabel="Nueva área" />
  `,
})
export class AreasComponent {}
