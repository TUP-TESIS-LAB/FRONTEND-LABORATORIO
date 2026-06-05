import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

const MOTIVOS = ['Paciente no se presentó', 'Error de carga', 'Atención duplicada', 'A pedido del paciente'];

@Component({
  selector: 'lab-cancel-attention-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onHide()" [modal]="true" [style]="{ width: '460px' }"
              header="Cancelar atención">
      <p class="text-sm opacity-70 mb-2">Esta acción cancela la atención. Indicá el motivo.</p>
      <div class="flex flex-wrap gap-2 mb-3">
        @for (m of motivos; track m) {
          <p-button [label]="m" severity="secondary" [outlined]="true" size="small" (onClick)="setReason(m)" />
        }
      </div>
      <textarea [(ngModel)]="reasonValue" rows="3"
                class="w-full border rounded p-2 text-sm"
                placeholder="Motivo de cancelación"></textarea>
      <ng-template pTemplate="footer">
        <p-button label="Volver" severity="secondary" [text]="true" (onClick)="onHide()" />
        <p-button label="Cancelar atención" severity="danger" [disabled]="!valid()" (onClick)="confirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class CancelAttentionModalComponent {
  readonly visible   = input<boolean>(false);
  readonly confirmed = output<string>();
  readonly dismissed = output<void>();

  protected readonly motivos = MOTIVOS;
  protected reasonValue = '';

  setReason(value: string): void { this.reasonValue = value; }
  protected valid(): boolean { return this.reasonValue.trim().length > 0; }
  confirm(): void {
    const r = this.reasonValue.trim();
    if (!r) return;
    this.confirmed.emit(r);
    this.reasonValue = '';
  }
  onHide(): void { this.reasonValue = ''; this.dismissed.emit(); }
}
