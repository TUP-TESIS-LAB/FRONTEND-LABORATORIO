import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { race, take } from 'rxjs';
import { AttentionResponse } from '../../../../../models/atencion.model';
import { AttentionTicketModalComponent } from '../../../../../components/attention-ticket-modal/attention-ticket-modal.component';
import {
  atencionMutationFailure,
  atencionMutationSuccess,
  endSecretaryPhase,
  loadAttentionAnalyses,
  loadAttentionPatient,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectMutating,
  selectResolvedPatient,
  selectSummaryAnalyses,
} from '../../../../../store/atencion/atencion.selectors';
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
        @if (patient(); as p) {
          <div class="text-base font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
          <div class="text-sm opacity-70">DNI {{ p.dni }}</div>
        } @else {
          <div class="text-base">ID {{ atencion().patientId ?? '—' }}</div>
        }
      </section>

      <section>
        <div class="text-sm opacity-60">Indicaciones</div>
        <div class="text-base">{{ atencion().indications || '—' }}</div>
      </section>

      <section>
        <div class="text-sm opacity-60">Análisis solicitados ({{ atencion().analysisAuthorizations.length }})</div>
        <ul class="list-disc list-inside text-sm">
          @for (a of atencion().analysisAuthorizations; track a.analysisId) {
            @let info = analysisById().get(a.analysisId);
            <li>
              @if (info) {
                <span class="font-mono opacity-70">{{ info.shortCode }}</span> — {{ info.name }}
              } @else {
                #{{ a.analysisId }}
              }
            </li>
          }
        </ul>
      </section>

      <div class="flex justify-end">
        <p-button label="Finalizar atención"
                  icon="pi pi-check"
                  [loading]="mutating()"
                  [disabled]="mutating()"
                  (onClick)="openFinalize()" />
      </div>

      <lab-attention-ticket-modal
        [visible]="ticketModalOpen()"
        (confirmed)="onFinishWithTicket($event)"
        (dismissed)="closeFinalize()" />
    </div>
  `,
})
export class ResumenStepComponent implements OnInit {
  private readonly store      = inject(Store);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  readonly atencion = input.required<AttentionResponse>();
  readonly finished = output<void>();

  readonly ticketModalOpen = signal(false);
  readonly mutating        = this.store.selectSignal(selectMutating);
  readonly patient         = this.store.selectSignal(selectResolvedPatient);
  readonly analyses        = this.store.selectSignal(selectSummaryAnalyses);

  readonly analysisById = computed(
    () => new Map(this.analyses().map(a => [a.id, a]))
  );

  ngOnInit(): void {
    const attn = this.atencion();

    // Only load patient if not already resolved for this atención
    if (
      attn.patientId != null &&
      (this.patient() === null || this.patient()?.id !== attn.patientId)
    ) {
      this.store.dispatch(loadAttentionPatient({ patientId: attn.patientId }));
    }

    // Always load analysis details
    const analysisIds = attn.analysisAuthorizations.map(x => x.analysisId);
    this.store.dispatch(loadAttentionAnalyses({ analysisIds }));
  }

  openFinalize(): void  { this.ticketModalOpen.set(true); }
  closeFinalize(): void { this.ticketModalOpen.set(false); }

  /**
   * Finalizar la atención — pessimistic UI.
   *
   * Dispatchamos endSecretaryPhase y SOLO emitimos `finished` + limpiamos
   * session storage cuando llega `atencionMutationSuccess`. Si la mutación
   * falla, el usuario queda en el wizard con el estado actual y puede
   * reintentar — antes navegaba afuera y perdía contexto.
   *
   * `printTicket` queda como hook futuro — no hay endpoint de ticket todavía.
   */
  onFinishWithTicket(printTicket: boolean): void {
    this.ticketModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    void printTicket;
    this.waitForMutation((ok) => {
      if (!ok) return; // backend rechazó — el wizard queda como está, no salimos
      clearAtencionSession();
      this.finished.emit();
    });
  }

  private waitForMutation(cb: (ok: boolean) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      // Pasamos destroyRef explícito porque waitForMutation se llama fuera del
      // injection context (desde un click handler), donde takeUntilDestroyed()
      // sin argumentos lanza NG0203.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type));
  }
}
