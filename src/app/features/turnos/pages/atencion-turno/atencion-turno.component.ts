import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'app-atencion-turno',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageHeaderComponent],
  template: `<ui-page-header heading="Atención de turno" /><ui-empty-state heading="Atención de turno" icon="pi-user-edit" />`,
})
export class AtencionTurnoComponent {}
