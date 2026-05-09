import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-colas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Gestión de Colas</h2><ui-empty-state heading="Gestión de Colas" icon="pi-list" />`,
})
export class ColasComponent {}
