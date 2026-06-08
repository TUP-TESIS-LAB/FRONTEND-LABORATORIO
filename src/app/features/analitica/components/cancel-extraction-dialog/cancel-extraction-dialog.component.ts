import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  model,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InExtractionItem } from '../../models/extraction.model';

@Component({
  selector: 'app-cancel-extraction-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closable]="!saving()"
      [closeOnEscape]="!saving()"
      [style]="{ width: '440px' }"
      [header]="headerText()"
    >
      <p class="body">
        ¿Confirmar la cancelación de la extracción? El paciente volverá a la cola de espera.
      </p>
      <ng-template pTemplate="footer">
        <p-button
          label="Volver"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="visible.set(false)"
        />
        <p-button
          label="Cancelar extracción"
          icon="pi pi-times"
          severity="danger"
          [loading]="saving()"
          [disabled]="saving()"
          (onClick)="onConfirm()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: [`:host { display: contents; } .body { margin: 0; font-size: 14px; color: #475569; line-height: 1.6; }`],
})
export class CancelExtractionDialogComponent {
  readonly visible = model<boolean>(false);
  readonly patient = input<InExtractionItem | null>(null);
  readonly saving = input<boolean>(false);

  @Output() readonly cancelConfirmed = new EventEmitter<{ reason: string }>();

  readonly headerText = computed(() => {
    const p = this.patient();
    return p ? `Cancelar extracción de ${p.patientFullName}` : 'Cancelar extracción';
  });

  onConfirm(): void {
    this.cancelConfirmed.emit({ reason: 'OTRO' });
  }
}
