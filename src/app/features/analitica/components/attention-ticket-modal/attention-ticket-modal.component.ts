import {
  ChangeDetectionStrategy, Component, input, output,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'lab-attention-ticket-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onHide()" [modal]="true" [style]="{ width: '420px' }"
              header="Finalizar atención">
      <p class="text-sm">¿Querés imprimir el ticket de la atención?</p>
      <ng-template pTemplate="footer">
        <p-button label="Sin ticket" severity="secondary" [text]="true" (onClick)="confirmWithoutTicket()" />
        <p-button label="Imprimir ticket" (onClick)="confirmWithTicket()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AttentionTicketModalComponent {
  readonly visible   = input<boolean>(false);
  readonly confirmed = output<boolean>();
  readonly dismissed = output<void>();

  confirmWithTicket(): void { this.confirmed.emit(true); }
  confirmWithoutTicket(): void { this.confirmed.emit(false); }
  onHide(): void { this.dismissed.emit(); }
}
