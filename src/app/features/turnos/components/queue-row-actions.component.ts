import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-queue-row-actions',
  standalone: true,
  imports: [ButtonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './queue-row-actions.component.html',
  styles: [`
    :host {
      display: inline-flex;
      gap: 0.375rem;
      align-items: center;
    }
    // Centra el X del Cancelar dentro del boton rounded icon-only.
    // PrimeNG deja padding lateral pensando en el label aunque no haya,
    // lo que recorre el icono a la derecha. Forzamos cuadrado + padding 0.
    :host ::ng-deep .p-button.p-button-rounded.p-button-icon-only {
      width: 2rem;
      height: 2rem;
      padding: 0;
      .p-button-icon { margin: 0; }
    }
  `],
})
export class QueueRowActionsComponent {
  @Input({ required: true }) entryId!: number;
  @Output() call = new EventEmitter<void>();
  @Output() nuevaAtencion = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
