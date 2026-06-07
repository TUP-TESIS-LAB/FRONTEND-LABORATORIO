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
import { FormsModule } from '@angular/forms';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { race, take } from 'rxjs';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { AttentionResponse } from '../../../../../models/atencion.model';
import { AttentionTicketModalComponent } from '../../../../../components/attention-ticket-modal/attention-ticket-modal.component';
import {
  atencionMutationFailure,
  atencionMutationSuccess,
  endSecretaryPhase,
  loadAttentionAnalyses,
  loadAttentionPatient,
  loadPricing,
  setCopayment,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectCopaymentMutating,
  selectMutating,
  selectPricing,
  selectPricingLoading,
  selectResolvedPatient,
  selectSummaryAnalyses,
} from '../../../../../store/atencion/atencion.selectors';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, AttentionTicketModalComponent, InputNumberModule, FormsModule, CurrencyArPipe],
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
            @let priceItem = pricingById().get(a.analysisId);
            <li class="flex items-center justify-between gap-2">
              <span>
                @if (info) {
                  <span class="font-mono opacity-70">{{ info.shortCode }}</span> — {{ info.name }}
                } @else {
                  #{{ a.analysisId }}
                }
              </span>
              @if (priceItem != null) {
                <span class="text-sm font-medium">
                  {{ priceItem.precioPaciente | currencyAr }}
                </span>
              }
            </li>
          }
        </ul>
      </section>

      <!-- Pricing totals -->
      @if (pricing(); as p) {
        <section class="border-t pt-3 space-y-1">
          <div class="flex justify-between text-sm">
            <span class="opacity-60">Subtotal</span>
            <span>{{ p.subtotal | currencyAr }}</span>
          </div>
          <div class="flex justify-between text-sm items-center gap-4">
            <label class="opacity-60 whitespace-nowrap" for="copago-input">Copago (orden médica)</label>
            <p-inputNumber
              inputId="copago-input"
              [ngModel]="copaymentValue()"
              (ngModelChange)="copaymentValue.set($event)"
              (onBlur)="onCopaymentBlur()"
              mode="decimal"
              [minFractionDigits]="2"
              [maxFractionDigits]="2"
              [min]="0"
              [disabled]="copaymentMutating()"
              styleClass="w-36"
              inputStyleClass="text-right"
              placeholder="0,00"
            />
          </div>
          <div class="flex justify-between text-base font-semibold border-t pt-1">
            <span>Total</span>
            <span>{{ p.total | currencyAr }}</span>
          </div>
        </section>
      } @else if (pricingLoading()) {
        <section class="border-t pt-3">
          <div class="text-sm opacity-60">Calculando precios…</div>
        </section>
      }

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

  readonly ticketModalOpen    = signal(false);
  readonly mutating           = this.store.selectSignal(selectMutating);
  readonly patient            = this.store.selectSignal(selectResolvedPatient);
  readonly analyses           = this.store.selectSignal(selectSummaryAnalyses);
  readonly pricing            = this.store.selectSignal(selectPricing);
  readonly pricingLoading     = this.store.selectSignal(selectPricingLoading);
  readonly copaymentMutating  = this.store.selectSignal(selectCopaymentMutating);

  /** Valor local del input de copago — se inicializa desde la atención y se actualiza al cambiar */
  readonly copaymentValue = signal<number | null>(null);

  readonly analysisById = computed(
    () => new Map(this.analyses().map(a => [a.id, a]))
  );

  readonly pricingById = computed(() => {
    const p = this.pricing();
    if (!p) return new Map<number, { precioPaciente: number }>();
    return new Map(p.items.map(item => [item.analysisId, item]));
  });

  ngOnInit(): void {
    const attn = this.atencion();

    // Initialize copago from attention
    this.copaymentValue.set(attn.copaymentAmount ?? null);

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

    // Load pricing for this attention
    this.store.dispatch(loadPricing({ attentionId: attn.id }));
  }

  onCopaymentBlur(): void {
    const attn = this.atencion();
    const amount = this.copaymentValue();
    // Only dispatch if the value actually changed
    const current = attn.copaymentAmount ?? null;
    if (amount === current) return;
    this.store.dispatch(setCopayment({ attentionId: attn.id, copaymentAmount: amount }));
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
