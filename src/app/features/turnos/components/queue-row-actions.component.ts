import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-queue-row-actions',
  standalone: true,
  imports: [MenuModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './queue-row-actions.component.html',
})
export class QueueRowActionsComponent {
  @Input({ required: true }) entryId!: number;
  @Output() call = new EventEmitter<void>();
  @Output() nuevaAtencion = new EventEmitter<void>();

  protected readonly items: MenuItem[] = [
    { label: 'Llamar por pantalla', icon: 'pi pi-megaphone', command: () => this.call.emit() },
    { label: 'Nueva atención', icon: 'pi pi-arrow-right', command: () => this.nuevaAtencion.emit() },
  ];
}
