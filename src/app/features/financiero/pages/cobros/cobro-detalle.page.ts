import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

import {
  selectCobroSelected,
  selectCobrosLoading,
  selectCobrosError,
} from '../../store/financiero.selectors';
import { loadPayment, cancelPayment } from '../../store/financiero.actions';

import { MetodoChipComponent } from '../../components/metodo-chip.component';
import { EstadoPagoPillComponent } from '../../components/estado-pago-pill.component';
import { ComprobanteCardComponent } from '../../components/comprobante-card.component';
import { CancelarPagoModalComponent } from './components/cancelar-pago-modal.component';
import { METHOD_META } from '../../models/financiero.model';

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
            <div class="fin-card fin-pad fin-actions-col">
              <button class="fin-action-btn" type="button" (click)="imprimir()">
                <i class="pi pi-print"></i> Imprimir ticket
              </button>
              <button class="fin-action-btn" type="button" (click)="descargar()">
                <i class="pi pi-download"></i> Descargar PDF
              </button>
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
  `],
})
export class CobroDetallePage implements OnInit {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  protected readonly payment = this.store.selectSignal(selectCobroSelected);
  protected readonly loading = this.store.selectSignal(selectCobrosLoading);
  protected readonly error   = this.store.selectSignal(selectCobrosError);

  protected readonly cancelModalOpen = signal(false);

  protected readonly cashImpact = computed(() => {
    const p = this.payment();
    if (!p) return 0;
    return p.collections.reduce((sum, col) =>
      METHOD_META[col.method]?.esEfectivo ? sum + col.amount : sum, 0);
  });

  /**
   * El backend retorna el Payment pero FiscalInvoiceReference viene como propiedad extendida.
   * Por ahora el modelo base no la incluye, se accede por cast.
   */
  protected readonly fiscalRef = computed(() => {
    const p = this.payment() as any;
    return p?.fiscalReference ?? null;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.store.dispatch(loadPayment({ id: +idParam }));
    }
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

  protected imprimir(): void {
    window.print();
  }

  protected descargar(): void {
    // PDF download — funcionalidad futura
    window.print();
  }

  protected isEfectivo(method: string): boolean {
    return METHOD_META[method as keyof typeof METHOD_META]?.esEfectivo ?? false;
  }
}
