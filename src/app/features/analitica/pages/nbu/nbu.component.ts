import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

/**
 * Placeholder — Task 4 (KAN-118) implementa la pantalla real del nomenclador.
 * Se mantiene la ruta /nbu activa pero sin lógica de store.
 */
@Component({
  selector: 'app-nbu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>NBU</h2>
    <ui-empty-state heading="Nomenclador en construcción" icon="pi-list" />
  `,
})
export class NbuComponent {}
