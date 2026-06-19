import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { COMPROBANTE_META, ComprobanteTipo } from '../models/financiero.model';
import { FiscalInvoiceReference } from '../models/financiero.model';

@Component({
  selector: 'fin-comprobante-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ref()) {
      <div class="cc-wrap" [class.cc-wrap--void]="ref()!.isVoid">
        <div class="cc-top">
          <div class="cc-badge" [class.cc-badge--electronic]="ref()!.electronic" [class.cc-badge--receipt]="!ref()!.electronic">
            <i [class]="'pi ' + (ref()!.electronic ? 'pi-verified' : 'pi-receipt')"></i>
          </div>
          <div class="cc-meta">
            <div class="cc-tipo">{{ compMeta().label }}</div>
            <div class="cc-sub">{{ compMeta().sub }}</div>
          </div>
        </div>
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
          @if (ref()!.isVoid) {
            <div class="cc-line">
              <span class="cc-lbl">Estado</span>
              <span class="cc-elec cc-elec--void">
                <i class="pi pi-ban"></i> Anulado
              </span>
            </div>
          }
        </div>
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

    .cc-tipo { font-size: 14px; font-weight: 600; color: var(--ds-text, #1a1a2e); }
    .cc-sub  { font-size: 12px; color: var(--ds-text-muted, #6b7280); margin-top: 2px; }

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
}
