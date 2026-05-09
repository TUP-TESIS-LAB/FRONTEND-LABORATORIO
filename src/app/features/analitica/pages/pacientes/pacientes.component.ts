import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Pacientes</h2><ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" />`,
})
export class PacientesComponent {}
