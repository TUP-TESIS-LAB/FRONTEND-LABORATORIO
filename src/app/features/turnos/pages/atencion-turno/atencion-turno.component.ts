import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-atencion-turno',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Atención de Turno</h2><ui-empty-state heading="Atención de Turno" icon="pi-user-edit" />`,
})
export class AtencionTurnoComponent {}
