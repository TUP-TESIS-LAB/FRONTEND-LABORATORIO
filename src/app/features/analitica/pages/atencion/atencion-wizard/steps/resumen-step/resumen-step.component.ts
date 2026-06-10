import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
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
import { AnalysisDetail, AttentionResponse } from '../../../../../models/atencion.model';
import { FinalizeAttentionModalComponent } from '../../../../../components/finalize-attention-modal/finalize-attention-modal.component';
import {
  atencionMutationFailure,
  atencionMutationSuccess,
  downloadProtocolLabels,
  endSecretaryPhase,
  loadAtencion,
  loadAttentionAnalyses,
  loadAttentionPatient,
  loadPricing,
  removeAnalysisFromResumen,
  setCopayment,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectCopaymentMutating,
  selectMutating,
  selectPricing,
  selectPricingLoading,
  selectRemovingAnalysis,
  selectResolvedPatient,
  selectSummaryAnalyses,
} from '../../../../../store/atencion/atencion.selectors';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, FinalizeAttentionModalComponent, InputNumberModule, FormsModule, CurrencyArPipe],
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
        <ul class="list-none text-sm space-y-1">
          @for (a of atencion().analysisAuthorizations; track $index) {
            @let info = analysisById().get(a.analysisId);
            @let priceItem = pricingById().get(a.analysisId);
            <li class="flex items-center justify-between gap-2">
              <span class="flex-1">
                @if (info) {
                  {{ info.name }}
                  @if (info.nbuCode) {
                    <span class="font-mono text-xs opacity-70">· NBU {{ info.nbuCode }}</span>
                  }
                } @else {
                  #{{ a.analysisId }}
                }
              </span>
              @if (priceItem != null) {
                <span class="text-sm font-medium">
                  {{ priceItem.precioPaciente | currencyAr }}
                </span>
              }
              <p-button
                icon="pi pi-times"
                severity="danger"
                [text]="true"
                [rounded]="true"
                size="small"
                pTooltip="Quitar análisis"
                tooltipPosition="left"
                [disabled]="removingAnalysis() || copaymentMutating()"
                [loading]="removingAnalysis()"
                (onClick)="onRemoveAnalysis(a.analysisId)"
                aria-label="Quitar análisis"
              />
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
              styleClass="w-40"
              inputStyleClass="w-40 text-right"
              placeholder="0,00"
            />
          </div>
          <div class="flex justify-between text-base font-semibold border-t pt-1">
            <span>Total</span>
            <span>{{ liveTotal() | currencyAr }}</span>
          </div>
        </section>
      } @else if (pricingLoading()) {
        <section class="border-t pt-3">
          <div class="text-sm opacity-60">Calculando precios…</div>
        </section>
      }

      <div class="flex justify-between items-center mt-4">
        <p-button label="Volver fase" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
                  [disabled]="returnDisabled() || !canReturn()" (onClick)="returnPhase.emit()" />
        <p-button label="Finalizar atención"
                  icon="pi pi-check"
                  [loading]="mutating()"
                  [disabled]="mutating()"
                  (onClick)="openFinalize()" />
      </div>

      <lab-finalize-attention-modal
        [visible]="finalizeModalOpen()"
        (confirmed)="onFinalize()"
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

  /** Footer "Volver fase" — el wizard provee el estado y bindea el handler. */
  readonly canReturn      = input<boolean>(false);
  readonly returnDisabled = input<boolean>(false);
  readonly returnPhase    = output<void>();

  readonly finalizeModalOpen  = signal(false);
  readonly mutating           = this.store.selectSignal(selectMutating);
  readonly patient            = this.store.selectSignal(selectResolvedPatient);
  readonly analyses           = this.store.selectSignal(selectSummaryAnalyses);
  readonly pricing            = this.store.selectSignal(selectPricing);
  readonly pricingLoading     = this.store.selectSignal(selectPricingLoading);
  readonly copaymentMutating  = this.store.selectSignal(selectCopaymentMutating);
  readonly removingAnalysis   = this.store.selectSignal(selectRemovingAnalysis);

  /** Valor local del input de copago — se inicializa desde la atención y se actualiza al cambiar */
  readonly copaymentValue = signal<number | null>(null);

  readonly analysisById = computed(
    // `summaryAnalyses` se carga con AnalysisService.getById → AnalysisDetail (trae nbuCode/name),
    // aunque el slice del store esté tipado como Analysis. Widening seguro para exponer el NBU.
    () => new Map((this.analyses() as AnalysisDetail[]).map(a => [a.id, a]))
  );

  /**
   * Carga reactiva de los detalles de análisis.
   *
   * Antes esto vivía como dispatch one-shot en ngOnInit con un snapshot de
   * `atencion().analysisAuthorizations`. Problema: el wizard puede montar el
   * resumen con una atención cuyo set de autorizaciones todavía no refleja lo
   * cargado en el paso 2 (loadAtencion refresca async DESPUÉS). En esa carrera
   * `summaryAnalyses` quedaba sin los análisis que el `@for` termina mostrando
   * y la fila caía al fallback `#{id}` en vez del nombre + NBU.
   *
   * Con un effect, re-disparamos loadAttentionAnalyses cada vez que cambia el
   * set de autorizaciones (agregar/quitar análisis, refresh del detail), así
   * los detalles siempre cubren lo que se renderiza. `lastLoadedKey` deduplica
   * para no re-pegar al back cuando cambia otra cosa de la atención (copago,
   * pricing) sin que cambien los ids.
   */
  private lastLoadedKey = '';
  private readonly analysesLoader = effect(() => {
    const ids = this.atencion().analysisAuthorizations.map(a => a.analysisId);
    if (ids.length === 0) return;
    const key = ids.join(',');
    if (key === this.lastLoadedKey) return;
    this.lastLoadedKey = key;
    this.store.dispatch(loadAttentionAnalyses({ analysisIds: ids }));
  });

  readonly pricingById = computed(() => {
    const p = this.pricing();
    if (!p) return new Map<number, { precioPaciente: number }>();
    return new Map(p.items.map(item => [item.analysisId, item]));
  });

  /**
   * Total EN VIVO: subtotal del pricing + el coseguro tipeado en el input.
   * El backend computa total = subtotal + copayment; replicamos esa fórmula localmente
   * para que el total se recalcule mientras la secretaria escribe el monto, sin esperar
   * al blur + round-trip que persiste y refresca el pricing. Cuando el pricing vuelve del
   * backend ya incluye el copago, y como copaymentValue queda igual, el número coincide.
   */
  readonly liveTotal = computed<number | null>(() => {
    const p = this.pricing();
    if (!p) return null;
    return p.subtotal + (this.copaymentValue() ?? 0);
  });

  ngOnInit(): void {
    const attn = this.atencion();

    // Refrescar el detail para que analysisAuthorizations refleje lo cargado en el paso 2.
    this.store.dispatch(loadAtencion({ id: attn.id }));

    // Initialize copago from attention
    this.copaymentValue.set(attn.copaymentAmount ?? null);

    // Only load patient if not already resolved for this atención
    if (
      attn.patientId != null &&
      (this.patient() === null || this.patient()?.id !== attn.patientId)
    ) {
      this.store.dispatch(loadAttentionPatient({ patientId: attn.patientId }));
    }

    // Los detalles de análisis se cargan reactivamente — ver `analysesLoader`.

    // Load pricing for this attention
    this.store.dispatch(loadPricing({ attentionId: attn.id }));
  }

  onRemoveAnalysis(analysisId: number): void {
    const attn = this.atencion();
    const reducedItems = attn.analysisAuthorizations
      .filter(a => a.analysisId !== analysisId)
      .map(a => ({ analysisId: a.analysisId, isAuthorized: a.isAuthorized }));
    this.store.dispatch(removeAnalysisFromResumen({
      attentionId: attn.id,
      analysisId,
      payload: {
        items: reducedItems,
        isUrgent: attn.isUrgent,
        authorizationNumber: attn.authorizationNumber,
      },
    }));
  }

  onCopaymentBlur(): void {
    const attn = this.atencion();
    const amount = this.copaymentValue();
    // Only dispatch if the value actually changed
    const current = attn.copaymentAmount ?? null;
    if (amount === current) return;
    this.store.dispatch(setCopayment({ attentionId: attn.id, copaymentAmount: amount }));
  }

  openFinalize(): void  { this.finalizeModalOpen.set(true); }
  closeFinalize(): void { this.finalizeModalOpen.set(false); }

  /**
   * Finalizar la atención — pessimistic UI.
   *
   * Dispatchamos endSecretaryPhase y SOLO emitimos `finished` + limpiamos
   * session storage cuando llega `atencionMutationSuccess`. Si la mutación
   * falla, el usuario queda en el wizard con el estado actual y puede
   * reintentar — antes navegaba afuera y perdía contexto.
   *
   * (Se quitó el flag `printTicket`: era un stub vacío y no existe comprobante
   *  de atención. Ver FinalizeAttentionModalComponent para el detalle.)
   */
  onFinalize(): void {
    this.finalizeModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    this.waitForMutation((success) => {
      if (!success) return; // backend rechazó — el wizard queda como está, no salimos
      // Auto-descarga de rótulos: al finalizar la fase de secretaría el backend
      // ya generó un rótulo por análisis. Disparamos la descarga del PDF sin que el
      // operador tenga que ir al listado y clickear "Rótulos" a mano.
      // El protocolId fresco viene en el item del success (recién se le asigna el
      // protocolo al cerrar la fase); caemos a la atención actual por si acaso.
      const protocolId = success.item.protocolId ?? this.atencion().protocolId;
      if (protocolId != null) {
        this.store.dispatch(downloadProtocolLabels({ protocolId, protocolNumber: `P-${protocolId}` }));
      }
      clearAtencionSession();
      this.finished.emit();
    });
  }

  private waitForMutation(cb: (success: ReturnType<typeof atencionMutationSuccess> | null) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    )
      // Pasamos destroyRef explícito porque waitForMutation se llama fuera del
      // injection context (desde un click handler), donde takeUntilDestroyed()
      // sin argumentos lanza NG0203.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => cb(action.type === atencionMutationSuccess.type ? action : null));
  }
}
