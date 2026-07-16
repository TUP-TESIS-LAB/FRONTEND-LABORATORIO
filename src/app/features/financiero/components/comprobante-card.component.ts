import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { COMPROBANTE_META, ComprobanteTipo } from '../models/financiero.model';
import { comprobanteDisplayState, FiscalInvoiceReference } from '../models/financiero.model';

@Component({
  selector: 'fin-comprobante-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    @if (ref()) {
      <div class="cc-wrap" [class.cc-wrap--void]="ref()!.isVoid">
        <div class="cc-top">
          <div class="cc-badge"
               [class.cc-badge--electronic]="ref()!.electronic && !isPending() && !isFailed()"
               [class.cc-badge--receipt]="!ref()!.electronic"
               [class.cc-badge--pending]="isPending()"
               [class.cc-badge--failed]="isFailed()">
            <i [class]="'pi ' + badgeIcon()"></i>
          </div>
          <div class="cc-meta">
            <div class="cc-tipo">{{ compMeta().label }}</div>
            <div class="cc-sub">{{ compMeta().sub }}</div>
          </div>
        </div>

        @if (isPending()) {
          <div class="cc-status cc-status--pending">
            <i class="pi pi-clock"></i>
            <span>Emisión pendiente. El CAE se está resolviendo con ARCA — esperá unos segundos.</span>
          </div>
        } @else if (isFailed()) {
          <div class="cc-status cc-status--failed">
            <i class="pi pi-exclamation-triangle"></i>
            <span>No se pudo emitir el comprobante fiscal. Contactá al administrador.</span>
          </div>
        } @else {
          <div class="cc-rows">
            <div class="cc-line">
              <span class="cc-lbl">Número</span>
              <span class="cc-val cc-mono">{{ ref()!.internalReference ?? ref()!.externalInvoiceId ?? '—' }}</span>
            </div>
            <div class="cc-line">
              <span class="cc-lbl">Tipo</span>
              <span class="cc-elec" [class.cc-elec--yes]="ref()!.electronic" [class.cc-elec--no]="!ref()!.electronic">
                <i [class]="'pi ' + (ref()!.electronic ? 'pi-check' : 'pi-minus')"></i>
                {{ ref()!.electronic ? 'Electrónico' : 'Recibo interno' }}
              </span>
            </div>
            @if (ref()!.cae) {
              <div class="cc-line">
                <span class="cc-lbl">CAE</span>
                <span class="cc-val cc-mono">{{ ref()!.cae }}</span>
              </div>
            }
            @if (ref()!.caeVencimiento) {
              <div class="cc-line">
                <span class="cc-lbl">Vencimiento CAE</span>
                <span class="cc-val">{{ ref()!.caeVencimiento | date:'dd/MM/yyyy' }}</span>
              </div>
            }
            @if (ref()!.puntoVenta || ref()!.numeroComprobante) {
              <div class="cc-line">
                <span class="cc-lbl">Comprobante</span>
                <span class="cc-val cc-mono">{{ ref()!.puntoVenta ?? '—' }}-{{ ref()!.numeroComprobante ?? '—' }}</span>
              </div>
            }
            @if (ref()!.isVoid) {
              <div class="cc-line">
                <span class="cc-lbl">Estado</span>
                <span class="cc-elec cc-elec--void">
                  <i class="pi pi-ban"></i> Anulado
                </span>
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="cc-empty">
        <i class="pi pi-file-o"></i>
        <span>Sin comprobante</span>
      </div>
    }
  `,
  styles: [`
    .cc-wrap {
      border: 1px solid #e8edf3; border-radius: 10px;
      padding: 16px; background: #fff;
      transition: opacity 150ms;
    }
    .cc-wrap--void { opacity: 0.6; }

    .cc-top {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
    }
    .cc-badge {
      width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .cc-badge--electronic { background: #e3f6ec; color: #0f8a55; }
    .cc-badge--receipt    { background: #f1f5f9; color: #5b6170; }
    .cc-badge--pending    { background: #fef3c7; color: #b45309; }
    .cc-badge--failed     { background: #fdecea; color: #b91c1c; }

    .cc-tipo { font-size: 14px; font-weight: 600; color: var(--ds-text, #1a1a2e); }
    .cc-sub  { font-size: 12px; color: var(--ds-text-muted, #6b7280); margin-top: 2px; }

    .cc-status {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 12.5px; border-radius: 8px; padding: 10px 12px;
    }
    .cc-status--pending { background: #fef3c7; color: #92400e; }
    .cc-status--failed  { background: #fdecea; color: #8a2020; }
    .cc-status i { margin-top: 1px; }

    .cc-rows { display: flex; flex-direction: column; gap: 6px; }
    .cc-line {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
    }
    .cc-lbl  { color: var(--ds-text-muted, #6b7280); }
    .cc-val  { color: var(--ds-text, #1a1a2e); font-weight: 500; }
    .cc-mono { font-family: monospace; letter-spacing: 0.03em; }

    .cc-elec {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 500;
    }
    .cc-elec i { font-size: 10px; }
    .cc-elec--yes  { background: #e3f6ec; color: #0f8a55; }
    .cc-elec--no   { background: #f1f5f9; color: #5b6170; }
    .cc-elec--void { background: #fdecea; color: #b91c1c; }

    .cc-empty {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px; border-radius: 10px;
      border: 1px dashed #d1d8e0; color: #94a3b8; font-size: 13px;
    }
    .cc-empty i { font-size: 16px; }
  `],
})
export class ComprobanteCardComponent {
  readonly ref = input<FiscalInvoiceReference | null>(null);

  protected readonly compMeta = computed(() => {
    const tipo = this.ref()?.comprobanteTipo;
    return tipo ? COMPROBANTE_META[tipo] : { label: 'Comprobante', sub: '' };
  });

  protected readonly displayState = computed(() => comprobanteDisplayState(this.ref()));
  protected readonly isPending = computed(() => this.displayState() === 'PENDING');
  protected readonly isFailed  = computed(() => this.displayState() === 'FAILED');

  protected readonly badgeIcon = computed(() => {
    if (this.isPending()) return 'pi-clock';
    if (this.isFailed()) return 'pi-exclamation-triangle';
    return this.ref()?.electronic ? 'pi-verified' : 'pi-receipt';
  });
}
