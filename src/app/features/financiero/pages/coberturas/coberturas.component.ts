import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-coberturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Coberturas</h2><ui-empty-state heading="Coberturas" icon="pi-shield" />`,
})
export class CoberturasComponent {}
