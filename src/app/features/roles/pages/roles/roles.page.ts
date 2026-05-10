import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-shield"
      heading="Roles y permisos"
      description="La gestión de roles y permisos se construye en una próxima iteración." />
  `,
})
export class RolesPage {}
