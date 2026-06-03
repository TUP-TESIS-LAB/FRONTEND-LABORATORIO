import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-queue-row-actions',
  standalone: true,
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './queue-row-actions.component.html',
  styles: [`
    :host {
      display: inline-flex;
      gap: 0.375rem;
    }
  `],
})
export class QueueRowActionsComponent {
  @Input({ required: true }) entryId!: number;
  @Output() call = new EventEmitter<void>();
  @Output() nuevaAtencion = new EventEmitter<void>();
}
