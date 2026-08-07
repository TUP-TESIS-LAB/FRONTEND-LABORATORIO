import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { PollingHandle, PollingService } from '@core/refresh';

import {
  selectCobroSelected,
  selectCobrosLoading,
  selectCobrosError,
  selectDownloadingComprobante,
} from '../../store/financiero.selectors';
import { loadPayment, pollPayment, cancelPayment, downloadComprobante } from '../../store/financiero.actions';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { EstadoPagoPillComponent } from '../../components/estado-pago-pill.component';
import { ComprobanteCardComponent } from '../../components/comprobante-card.component';
import { CancelarPagoModalComponent } from './components/cancelar-pago-modal.component';
import { METHOD_META, InvoiceEmissionStatus, PaymentStatus } from '../../models/financiero.model';

/** true si el emissionStatus amerita seguir polleando el detalle del pago. */
export function isPendingEmission(status: InvoiceEmissionStatus | null): boolean {
  return status === 'PENDING';
}

/**
 * true si corresponde ARRANCAR/MANTENER el polling del detalle del pago. Hallazgo #3 de la
 * review (Pertusati): `isPendingEmission` sola no alcanza — un pago CANCELLED puede quedar con
 * `emissionStatus` todavía en PENDING (la emisión nunca se completa porque ya no tiene sentido
 * emitir un comprobante de un pago anulado, KAN-242) y el polling seguiría para siempre. Se
 * corta apenas el pago pasa a CANCELLED, aunque el emissionStatus no haya llegado a un estado
 * terminal propio (EMITTED/FAILED).
 */
export function shouldPollEmission(
  emissionStatus: InvoiceEmissionStatus | null,
  paymentStatus: PaymentStatus | undefined,
): boolean {
  return isPendingEmission(emissionStatus) && paymentStatus !== 'CANCELLED';
}

/**
 * Tope de intentos de polling del detalle del pago antes de frenar y mostrar el fallback
 * manual (hallazgo #3, segunda parte). A `intervalMs: 5000` son ~2 minutos — suficiente para
 * que ARCA confirme el CAE en el caso normal sin dejar un poll infinito si algo se cuelga
 * del lado del proveedor fiscal.
 */
export const EMISSION_POLL_MAX_ATTEMPTS = 24;

/** true cuando se alcanzó (o superó) el tope de intentos sin que la emisión resuelva. */
export function hasReachedEmissionPollCap(
  attempts: number,
  maxAttempts: number = EMISSION_POLL_MAX_ATTEMPTS,
): boolean {
  return attempts >= maxAttempts;
}

/**
 * El botón "Descargar PDF" se bloquea mientras el comprobante ARCA está
 * PENDING (el backend devuelve 409 — el PDF todavía no existe), salvo en
 * pagos ya CANCELLED, que siempre se pueden descargar con watermark ANULADO
 * (regresión de KAN-242 a evitar). Los comprobantes no electrónicos (Factura
 * X) no tienen emissionStatus, así que nunca bloquean la descarga.
 */
export function isDownloadBlockedByPendingEmission(
  emissionStatus: InvoiceEmissionStatus | null,
  paymentStatus: PaymentStatus | undefined,
): boolean {
  return emissionStatus === 'PENDING' && paymentStatus !== 'CANCELLED';
}

@Component({
  selector: 'fin-cobro-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    CurrencyArPipe,
    MetodoChipComponent,
    EstadoPagoPillComponent,
    ComprobanteCardComponent,
    CancelarPagoModalComponent,
  ],
  template: `
    <div class="fin-detalle">

      <!-- ── CARGANDO ── -->
      @if (loading() && !payment()) {
        <div class="fin-card fin-pad fin-loading-center">
          <i class="pi pi-spin pi-spinner" style="font-size:24px; color: var(--ds-text-muted)"></i>
          <span>Cargando pago...</span>
        </div>
      }

      <!-- ── ERROR ── -->
      @else if (error() && !payment()) {
        <div class="fin-banner fin-banner--error">
          <div class="fin-banner-ico"><i class="pi pi-exclamation-circle"></i></div>
          <div class="fin-banner-txt">
            <div class="fin-banner-title">No se pudo cargar el pago</div>
            <div class="fin-banner-desc">{{ error() }}</div>
          </div>
        </div>
      }

      @else if (payment(); as p) {
        <!-- Encabezado con breadcrumb y status -->
        <div class="fin-detalle-head">
          <div class="fin-detalle-head-left">
            <button class="fin-back-btn" type="button" (click)="volver()">
              <i class="pi pi-arrow-left"></i> Cobros
            </button>
            <h1 class="fin-detalle-title">
              <i class="pi pi-receipt" style="color: var(--p-primary-color, #4f46e5)"></i>
              Pago #{{ p.id }}
            </h1>
            <p class="fin-detalle-sub">Ticket del pago, líneas de cobro y comprobante emitido.</p>
          </div>
          <div class="fin-detalle-head-right">
            <fin-estado-pago-pill [status]="p.status" />
          </div>
        </div>

        <!-- ── Banner cancelado ── -->
        @if (p.status === 'CANCELLED') {
          <div class="fin-banner fin-banner--cancelled">
            <div class="fin-banner-ico"><i class="pi pi-ban"></i></div>
            <div class="fin-banner-txt">
              <div class="fin-banner-title">Este pago fue cancelado</div>
              <div class="fin-banner-desc">
                {{ p.cancelReason || 'Sin motivo registrado.' }} · Comprobante anulado.
              </div>
            </div>
          </div>
        }

        <!-- ── Dos columnas ── -->
        <div class="fin-two-col">

          <!-- ── Columna izquierda: datos + líneas ── -->
          <div class="fin-col-left">

            <!-- Datos del pago -->
            <div class="fin-card fin-pad" style="margin-bottom: 18px;">
              <div class="fin-sec-cap">Datos del pago</div>
              <div class="fin-info-grid">
                <div class="fin-ig">
                  <div class="fin-ig-lbl">Atención</div>
                  <div class="fin-ig-val fin-mono">Atención #{{ p.attentionId }}</div>
                </div>
                <div class="fin-ig">
                  <div class="fin-ig-lbl">Fecha y hora</div>
                  <div class="fin-ig-val">
                    @if (p.cancelledAt) {
                      {{ p.cancelledAt | date:'dd/MM · HH:mm' }} hs
                    } @else {
                      —
                    }
                  </div>
                </div>
                <div class="fin-ig">
                  <div class="fin-ig-lbl">Total de estudios</div>
                  <div class="fin-ig-val fin-mono">{{ p.totalAmount | currencyAr }}</div>
                </div>
                <div class="fin-ig">
                  <div class="fin-ig-lbl">Cobrado al paciente</div>
                  <div class="fin-ig-val fin-mono fin-highlight">{{ p.copaymentAmount | currencyAr }}</div>
                </div>
              </div>
            </div>

            <!-- Líneas de cobro -->
            <div class="fin-card fin-pad">
              <div class="fin-sec-cap">Líneas de cobro</div>
              <div class="fin-breakdown">
                @for (col of p.collections; track col.id) {
                  <div class="fin-bd-row">
                    <fin-metodo-chip [metodo]="col.method" />
                    @if (col.reference) {
                      <span class="fin-bd-ref">{{ col.reference }}</span>
                    }
                    <span
                      class="fin-cash-flag"
                      [class.fin-cash-flag--cash]="isEfectivo(col.method)"
                      [class.fin-cash-flag--otro]="!isEfectivo(col.method)">
                      {{ isEfectivo(col.method) ? 'efectivo' : 'otro medio' }}
                    </span>
                    <span class="fin-bd-amt">{{ col.amount | currencyAr }}</span>
                  </div>
                }
                <!-- Total -->
                <div class="fin-bd-row fin-bd-total">
                  <span class="fin-bd-total-lbl">Total cobrado</span>
                  <span class="fin-bd-amt fin-bd-total-amt">{{ p.copaymentAmount | currencyAr }}</span>
                </div>
              </div>
              @if (cashImpact() > 0) {
                <div class="fin-cash-note">
                  <i class="pi pi-money-bill" style="color: #0f8a55"></i>
                  {{ cashImpact() | currencyAr }} impactaron el efectivo arqueable de la caja.
                  El resto son otros medios de pago.
                </div>
              }
            </div>
          </div>

          <!-- ── Columna derecha: comprobante + acciones ── -->
          <div class="fin-col-right">

            <!-- Comprobante -->
            <div style="margin-bottom: 18px;">
              <fin-comprobante-card [ref]="fiscalRef()" />
            </div>

            <!-- Acciones -->
            <!-- Hubo un botón "Imprimir ticket" que llamaba a window.print(): imprimía la
                 página del navegador, no el comprobante. El comprobante real es el PDF fiscal
                 que baja "Descargar PDF" (con su gating por emisión PENDING), así que se quitó
                 en vez de dejar dos acciones con el mismo efecto y distinto nombre. -->
            <div class="fin-card fin-pad fin-actions-col">
              <button
                class="fin-action-btn"
                type="button"
                [disabled]="downloadingComprobante() || downloadBlockedByPending()"
                (click)="descargar(p.id)">
                @if (downloadingComprobante()) {
                  <i class="pi pi-spin pi-spinner"></i> Descargando...
                } @else {
                  <i class="pi pi-download"></i> Descargar PDF
                }
              </button>
              @if (downloadBlockedByPending()) {
                <div class="fin-download-hint">
                  <i class="pi pi-info-circle"></i>
                  El comprobante todavía se está emitiendo. Vas a poder descargarlo apenas ARCA confirme el CAE.
                </div>
              }
              @if (emissionPollTimedOut()) {
                <div class="fin-download-hint fin-download-hint--warning">
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>
                    La emisión todavía no se resolvió. Actualizá manualmente para ver si ARCA ya confirmó el CAE.
                    <button type="button" class="fin-inline-link" (click)="actualizarEmisionManualmente()">Actualizar</button>
                  </span>
                </div>
              }
              @if (p.status === 'PROCESSED') {
                <button class="fin-action-btn fin-action-btn--danger" type="button" (click)="abrirCancelar()">
                  <i class="pi pi-ban"></i> Cancelar pago
                </button>
              } @else {
                <button class="fin-action-btn" type="button" disabled>
                  <i class="pi pi-ban"></i> Pago ya cancelado
                </button>
              }
            </div>
          </div>
        </div>

        <!-- ── Modal cancelar ── -->
        <fin-cancelar-pago-modal
          [visible]="cancelModalOpen()"
          [payment]="p"
          (closed)="cerrarCancelar()"
          (confirmed)="onCancelConfirmed($event, p.id)" />
      }
    </div>
  `,
  styles: [`
    .fin-detalle { display: flex; flex-direction: column; gap: 16px; }

    .fin-card   { border: 1px solid #e8edf3; border-radius: 10px; background: #fff; }
    .fin-pad    { padding: 16px 18px; }

    .fin-loading-center {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 40px; color: var(--ds-text-muted);
    }

    /* ── Encabezado ── */
    .fin-detalle-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px; margin-bottom: 4px;
    }
    .fin-detalle-head-left { display: flex; flex-direction: column; gap: 4px; }
    .fin-detalle-head-right { display: flex; align-items: center; }

    .fin-back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; border: none; cursor: pointer;
      color: var(--ds-text-muted, #6b7280); font-size: 13px;
      padding: 4px 0; border-radius: 4px;
    }
    .fin-back-btn:hover { color: var(--ds-text, #1a1a2e); }

    .fin-detalle-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 22px; font-weight: 700; margin: 0;
      color: var(--ds-text, #1a1a2e);
    }
    .fin-detalle-sub { font-size: 13.5px; color: var(--ds-text-muted, #6b7280); margin: 0; }

    /* ── Banner ── */
    .fin-banner {
      display: flex; align-items: flex-start; gap: 12px;
      border-radius: 8px; padding: 14px 16px;
    }
    .fin-banner--cancelled {
      background: #fdecea; border: 1px solid #f0c9c9;
    }
    .fin-banner--error {
      background: #fdecea; border: 1px solid #f0c9c9;
    }
    .fin-banner-ico { font-size: 18px; color: #b91c1c; flex-shrink: 0; margin-top: 1px; }
    .fin-banner-title { font-size: 14px; font-weight: 600; color: #8a2020; }
    .fin-banner-desc  { font-size: 13px; color: #a14a4a; margin-top: 2px; }

    /* ── Dos columnas ── */
    .fin-two-col {
      display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start;
    }
    @media (max-width: 768px) {
      .fin-two-col { grid-template-columns: 1fr; }
    }
    .fin-col-left, .fin-col-right { display: flex; flex-direction: column; }

    /* ── Secciones ── */
    .fin-sec-cap {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
      font-weight: 700; color: #94a3b8; margin-bottom: 12px;
    }

    /* ── Info grid ── */
    .fin-info-grid { display: flex; flex-direction: column; gap: 8px; }
    .fin-ig        { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .fin-ig-lbl    { font-size: 13px; color: var(--ds-text-muted, #6b7280); }
    .fin-ig-val    { font-size: 13px; font-weight: 500; color: var(--ds-text, #1a1a2e); }
    .fin-mono      { font-family: monospace; }
    .fin-highlight { color: var(--p-primary-color, #4f46e5); }

    /* ── Breakdown ── */
    .fin-breakdown { display: flex; flex-direction: column; gap: 8px; }
    .fin-bd-row {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; flex-wrap: wrap;
    }
    .fin-bd-ref  { color: var(--ds-text-muted, #6b7280); font-size: 12px; }
    .fin-bd-amt  { margin-left: auto; font-weight: 500; }

    .fin-cash-flag {
      font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 999px;
    }
    .fin-cash-flag--cash { background: #e3f6ec; color: #0f8a55; }
    .fin-cash-flag--otro { background: #eceef3; color: #5b6170; }

    .fin-bd-total {
      border-top: 1px solid #e8edf3; padding-top: 8px; margin-top: 4px;
    }
    .fin-bd-total-lbl { font-weight: 700; margin-right: auto; }
    .fin-bd-total-amt { font-size: 15px; font-weight: 700; }

    .fin-cash-note {
      display: flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: var(--ds-text-muted, #6b7280);
      margin-top: 12px;
    }

    /* ── Acciones ── */
    .fin-actions-col { display: flex; flex-direction: column; gap: 10px; }
    .fin-action-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 9px 14px; border-radius: 7px;
      font-size: 13.5px; font-weight: 500; cursor: pointer;
      border: 1px solid #e2e8f0; background: #fff;
      color: var(--ds-text, #1a1a2e); transition: background 100ms;
    }
    .fin-action-btn:hover:not(:disabled) { background: #f8fafc; }
    .fin-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .fin-action-btn--danger {
      border-color: #fca5a5; color: #b91c1c; background: #fff;
    }
    .fin-action-btn--danger:hover { background: #fdecea !important; }

    .fin-download-hint {
      display: flex; align-items: flex-start; gap: 6px;
      font-size: 11.5px; color: var(--ds-text-muted, #6b7280);
      padding: 0 2px;
    }
    .fin-download-hint i { margin-top: 1px; }
    .fin-download-hint--warning { color: #b45309; }
    .fin-inline-link {
      display: inline; padding: 0; margin-left: 4px; border: none; background: none;
      font: inherit; color: #2563eb; text-decoration: underline; cursor: pointer;
    }
  `],
})
export class CobroDetallePage implements OnInit {
  private readonly store   = inject(Store);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);

  protected readonly payment = this.store.selectSignal(selectCobroSelected);
  protected readonly loading = this.store.selectSignal(selectCobrosLoading);
  protected readonly error   = this.store.selectSignal(selectCobrosError);
  protected readonly downloadingComprobante = this.store.selectSignal(selectDownloadingComprobante);

  protected readonly cancelModalOpen = signal(false);

  protected readonly cashImpact = computed(() => {
    const p = this.payment();
    if (!p) return 0;
    return p.collections.reduce((sum, col) =>
      METHOD_META[col.method]?.esEfectivo ? sum + col.amount : sum, 0);
  });

  protected readonly fiscalRef = computed(() => this.payment()?.fiscalReference ?? null);
  protected readonly emissionStatus = computed(() => this.fiscalRef()?.emissionStatus ?? null);

  /**
   * Con ARCA, descargar en PENDING da 409 (el PDF todavía no existe). Los
   * comprobantes no electrónicos (Factura X) no tienen emissionStatus — quedan
   * disponibles al instante — y los pagos CANCELLED siempre se pueden
   * descargar (con watermark ANULADO, KAN-242), aunque hayan quedado con la
   * emisión pendiente al cancelarse.
   */
  protected readonly downloadBlockedByPending = computed(() =>
    isDownloadBlockedByPendingEmission(this.emissionStatus(), this.payment()?.status));

  /**
   * Polling condicional: patrón nuevo en el repo (nada más pollea sobre estado
   * de dominio hoy). El `effect()` arranca el handle recién cuando aparece
   * PENDING y lo para (nuleándolo) al llegar a estado terminal, al cancelarse
   * el pago (hallazgo #3) o al alcanzar `EMISSION_POLL_MAX_ATTEMPTS` (hallazgo
   * #3, tope) — `stop()` completa los subjects del handle y no es reiniciable,
   * así que no lo reusamos, creamos uno nuevo si hiciera falta.
   */
  private handle: PollingHandle | null = null;
  private pollAttempts = 0;

  /** true cuando el polling se frenó por tope de intentos sin que la emisión resuelva. */
  protected readonly emissionPollTimedOut = signal(false);

  constructor() {
    effect(() => {
      const status = this.emissionStatus();
      const paymentStatus = this.payment()?.status;

      if (shouldPollEmission(status, paymentStatus)) {
        if (!this.handle) {
          this.pollAttempts = 0;
          this.emissionPollTimedOut.set(false);
          this.handle = this.polling.startPolling({
            key: 'cobro-detalle',
            intervalMs: 5000,
            poll: () => {
              this.pollAttempts += 1;
              if (hasReachedEmissionPollCap(this.pollAttempts)) {
                this.handle?.stop();
                this.handle = null;
                this.emissionPollTimedOut.set(true);
                return of(null);
              }
              const p = this.payment();
              if (p) this.store.dispatch(pollPayment({ id: p.id }));
              return of(null);
            },
          });
        } else {
          this.handle.setActive(true);
        }
      } else if (this.handle) {
        this.handle.stop();
        this.handle = null;
      }
    });
  }

  /** Reintento manual del fallback: un solo poll fuera del schedule automático (que ya frenó). */
  protected actualizarEmisionManualmente(): void {
    const p = this.payment();
    if (!p) return;
    this.pollAttempts = 0;
    this.emissionPollTimedOut.set(false);
    this.store.dispatch(pollPayment({ id: p.id }));
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.store.dispatch(loadPayment({ id: +idParam }));
    }
    this.destroy.onDestroy(() => this.handle?.stop());
  }

  protected volver(): void {
    this.router.navigate(['/financiero/cobros']);
  }

  protected abrirCancelar(): void {
    this.cancelModalOpen.set(true);
  }

  protected cerrarCancelar(): void {
    this.cancelModalOpen.set(false);
  }

  protected onCancelConfirmed(reason: string, id: number): void {
    this.store.dispatch(cancelPayment({ id, reason }));
    this.cancelModalOpen.set(false);
  }

  protected descargar(paymentId: number): void {
    this.store.dispatch(downloadComprobante({ paymentId }));
  }

  protected isEfectivo(method: string): boolean {
    return METHOD_META[method as keyof typeof METHOD_META]?.esEfectivo ?? false;
  }
}
