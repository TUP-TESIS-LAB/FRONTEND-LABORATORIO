import {
  ChangeDetectionStrategy, Component, input, output,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

/**
 * Confirmación de cierre de la atención.
 *
 * Antes este modal ofrecía "Imprimir ticket", pero esa acción era un stub vacío
 * (`void printTicket`): no existe un comprobante de atención (paciente + análisis
 * + total) ni un endpoint/servicio que lo genere. El único PDF tipo "ticket" del
 * sistema es el número de turno del tótem (`TotemTicketPdfService`), que no aplica
 * a la finalización de una atención. Se quitó el stub y el modal quedó como una
 * confirmación simple de finalización (sigue siendo útil como guard contra cierres
 * accidentales). Si el negocio define un comprobante de atención real, se
 * reintroduce como una acción explícita con su propio generador de PDF.
 */
@Component({
  selector: 'lab-finalize-attention-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onHide()" [modal]="true" [draggable]="false" [style]="{ width: '420px' }"
              header="Finalizar atención">
      <p class="text-sm">¿Confirmás que querés finalizar la atención? No vas a poder modificar los análisis después.</p>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="onHide()" />
        <p-button label="Finalizar atención" (onClick)="confirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class FinalizeAttentionModalComponent {
  readonly visible   = input<boolean>(false);
  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  confirm(): void { this.confirmed.emit(); }
  onHide(): void { this.dismissed.emit(); }
}
