import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-configuracion-turnos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Configuración de Turnos</h2><ui-empty-state heading="Configuración de Turnos" icon="pi-sliders-h" />`,
})
export class ConfiguracionComponent {}
