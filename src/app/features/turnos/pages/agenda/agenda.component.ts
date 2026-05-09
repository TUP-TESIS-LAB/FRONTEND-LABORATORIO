import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Agenda de Turnos</h2><ui-empty-state heading="Sin turnos para hoy" icon="pi-calendar" ctaLabel="Nuevo turno" />`,
})
export class AgendaComponent {}
