import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AttentionResponse } from '../../../../../models/atencion.model';
import { AttentionTicketModalComponent } from '../../../../../components/attention-ticket-modal/attention-ticket-modal.component';
import { endSecretaryPhase } from '../../../../../store/atencion/atencion.actions';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, AttentionTicketModalComponent],
  template: `
    <div class="space-y-4">
      <header class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Resumen de la atención</h3>
        @if (atencion().isUrgent) {
          <p-tag value="URGENTE" severity="danger" />
        }
      </header>

      <section>
        <div class="text-sm opacity-60">Paciente</div>
        <div class="text-base">ID {{ atencion().patientId ?? '—' }}</div>
      </section>

      <section>
        <div class="text-sm opacity-60">Indicaciones</div>
        <div class="text-base">{{ atencion().indications || '—' }}</div>
      </section>

      <section>
        <div class="text-sm opacity-60">Análisis solicitados ({{ atencion().analysisAuthorizations.length }})</div>
        <ul class="list-disc list-inside text-sm">
          @for (a of atencion().analysisAuthorizations; track a.analysisId) {
            <li>#{{ a.analysisId }}</li>
          }
        </ul>
      </section>

      <div class="flex justify-end">
        <p-button label="Finalizar atención ✓" (onClick)="openFinalize()" />
      </div>

      <lab-attention-ticket-modal
        [visible]="ticketModalOpen()"
        (confirmed)="onFinishWithTicket($event)"
        (dismissed)="closeFinalize()" />
    </div>
  `,
})
export class ResumenStepComponent {
  private readonly store = inject(Store);

  readonly atencion = input.required<AttentionResponse>();
  readonly finished = output<void>();

  readonly ticketModalOpen = signal(false);

  openFinalize(): void { this.ticketModalOpen.set(true); }
  closeFinalize(): void { this.ticketModalOpen.set(false); }

  /**
   * Dispatch end-secretary-phase. Ticket printing is left as a future-only hook —
   * the modal records intent (printTicket boolean), but the actual ticket service
   * is out of scope for this iteration (no backend endpoint yet).
   */
  onFinishWithTicket(printTicket: boolean): void {
    this.ticketModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    clearAtencionSession();
    void printTicket;
    this.finished.emit();
  }
}
