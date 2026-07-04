import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageHeaderComponent],
  template: `
    <ui-page-header heading="Agenda de turnos" />
    <ui-empty-state heading="Sin turnos para hoy" icon="pi-calendar" ctaLabel="Nuevo turno" />
  `,
})
export class AgendaComponent {}
