import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Vista previa (mock) del informe PDF a escala. Replica la primera página del informe
 * de resultados con datos de ejemplo fijos; lo único que varía en vivo es lo configurable:
 * logo del encabezado, marca de agua, enlace del pie y leyenda de acreditación.
 *
 * Los estilos de esta preview son los del INFORME (paleta turquesa, líneas grises del PDF),
 * no los del design system de la app — por eso usan sus propios valores y no tokens --ds-*.
 */
@Component({
  selector: 'emp-informe-pdf-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pv-frame" [style.--pv-scale]="scale">
      <div class="pv-page">
        @if (bgSrc) {
          <div class="pv-watermark"><img [src]="bgSrc" alt="" /></div>
        }
        <div class="pv-sheet">
          <div class="pv-header">
            <div class="pv-logo">
              @if (headerSrc) { <img [src]="headerSrc" alt="Logo" /> }
            </div>
            <div class="pv-hc">
              <div class="l1">Laboratorio Automatizado de Análisis Clínicos</div>
              <div class="l2">Castillo-Chidiak</div>
            </div>
            <div class="pv-hr">
              <div class="nm">Dra. A. Leila Castillo · MP 4815</div>
              <div class="ro">Bioquímica</div>
            </div>
          </div>
          <div class="pv-acred">{{ legend }}</div>
          <div class="pv-rule"></div>
          <div class="pv-pac">
            <div class="k">Paciente:</div><div class="v">JUAN PÉREZ</div>
            <div class="k">Protocolo Nº:</div><div class="v">1001</div>
            <div class="k">Dr/a.:</div><div class="v m">—</div>
            <div class="k">Documento:</div><div class="v">12.345.678</div>
            <div class="k">Fecha de Análisis:</div><div class="v">26/06/2026</div>
            <div class="k">Fec. Nac.:</div><div class="v">01/01/1990</div>
            <div class="k">Obra Social:</div><div class="v">PAMI (INSSJP)</div>
            <div class="k"></div><div class="v"></div>
          </div>
          <div class="pv-res">
            <div class="pv-th">
              <div>Análisis</div>
              <div class="c">Valor Hallado</div>
              <div class="c">Valor de Referencia</div>
            </div>
            <div class="pv-grp">HEMOGRAMA</div>
            @for (r of rows; track r.det) {
              <div class="pv-row" [class.z]="$even">
                <div class="det">{{ r.det }}</div>
                <div><span class="num">{{ r.num }}</span><span class="u">{{ r.unit }}</span></div>
                <div class="ref">{{ r.ref }}</div>
              </div>
            }
          </div>
          <div class="pv-sp"></div>
          <div class="pv-firmas">
            <div class="pv-firma">
              <div class="rol">Controló Dr/a:</div><div class="ln"></div>
              <div class="fn">PAOLA KARINA ACOSTA</div><div class="sub">M.P. 5325</div>
            </div>
            <div class="pv-firma">
              <div class="rol">Autorizado por:</div>
              @if (authorizerSignatureSrc) {
                <div class="sig"><img [src]="authorizerSignatureSrc" alt="Firma del autorizante" /></div>
              }
              <div class="ln"></div>
              @if (authorizerName) {
                <div class="fn">{{ authorizerName }}</div>
                @if (authorizerRegistration) {
                  <div class="sub">M.P. {{ authorizerRegistration }}</div>
                }
              } @else {
                <div class="fn">-</div>
              }
            </div>
          </div>
        </div>
        <div class="pv-footer">
          <div class="web">{{ footerLink || '—' }}</div>
          <div class="hash">Hash de integridad: 7a1b588423725fac80bf12869ef8907fc5ea1a9498cada06d7f091ed0e3923bf</div>
          <div class="pag">Pág. 1 de 1</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* Marco gris que contiene el A4 escalado para que entre sin scroll horizontal. */
    .pv-frame {
      background: #e9eaec; border: 1px solid var(--ds-surface); border-radius: 9px;
      padding: 18px; display: flex; justify-content: center; overflow: hidden;
    }
    /* A4 escalado por ancho disponible vía container query del contenedor. */
    .pv-page {
      width: 794px; min-height: 1123px; background: #fff; position: relative; overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,.12);
      font-family: Helvetica, Arial, sans-serif; color: #1a1a1a;
      display: flex; flex-direction: column;
      transform: scale(var(--pv-scale, .42)); transform-origin: top center;
      /* el alto visual se reduce por la escala; el margen negativo recupera el espacio sobrante */
      margin-bottom: calc(1123px * (var(--pv-scale, .42) - 1));
    }
    .pv-watermark {
      position: absolute; top: 54%; left: 50%; transform: translate(-50%,-50%);
      width: 620px; opacity: .16; pointer-events: none; z-index: 0;
    }
    .pv-watermark img { width: 100%; display: block; }
    .pv-sheet { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; padding: 30px 46px 24px; }
    .pv-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 18px; min-height: 56px; }
    .pv-logo { height: 56px; display: flex; align-items: center; justify-self: start; overflow: hidden; }
    .pv-logo img { height: 100%; width: auto; max-width: 100%; object-fit: contain; }
    .pv-hc { text-align: center; padding-top: 4px; }
    .pv-hc .l1 { font-size: 14px; color: #444; }
    .pv-hc .l2 { font-size: 23px; font-weight: bold; margin-top: 1px; }
    .pv-hr { text-align: right; padding-top: 6px; justify-self: end; }
    .pv-hr .nm { font-size: 11px; color: #444; }
    .pv-hr .ro { font-size: 11px; color: #787878; }
    .pv-acred { text-align: center; font-size: 9.5px; color: #787878; margin-top: 14px; min-height: 12px; }
    .pv-rule { height: 2.5px; background: #009999; margin-top: 9px; }
    .pv-pac { display: grid; grid-template-columns: auto 1fr auto 1fr; column-gap: 14px; row-gap: 7px; margin-top: 18px; font-size: 12px; }
    .pv-pac .k { color: #555; white-space: nowrap; }
    .pv-pac .v { font-weight: bold; }
    .pv-pac .v.m { font-weight: normal; color: #787878; }
    .pv-res { margin-top: 20px; }
    .pv-th {
      display: grid; grid-template-columns: 1fr 168px 168px; padding: 7px 0;
      border-top: 1.2px solid #1a1a1a; border-bottom: 1.2px solid #1a1a1a; font-size: 11px; font-weight: bold;
    }
    .pv-th .c { padding-left: 4px; }
    .pv-grp { font-size: 12px; font-weight: bold; padding: 13px 0 5px; }
    .pv-row {
      display: grid; grid-template-columns: 1fr 168px 168px; align-items: baseline;
      padding: 9.5px 0; border-bottom: .75px solid #DDDDDD; font-size: 12.5px;
    }
    .pv-row.z { background: rgba(15,23,30,.028); }
    .pv-row .det { color: #444; padding-left: 10px; }
    .pv-row .num { font-weight: bold; }
    .pv-row .u { color: #787878; margin-left: 4px; }
    .pv-row .ref { padding-left: 4px; color: #444; }
    .pv-sp { flex: 1; }
    .pv-firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 26px; }
    .pv-firma { text-align: center; }
    .pv-firma .rol { font-size: 11px; color: #555; margin-bottom: 30px; }
    /* Firma real del autorizante: alto fijo, centrada sobre la línea (espejo del PDF). */
    .pv-firma .sig { height: 34px; display: flex; align-items: flex-end; justify-content: center; margin: -30px auto 0; }
    .pv-firma .sig img { max-height: 34px; max-width: 175px; object-fit: contain; }
    .pv-firma .ln { width: 175px; height: .75px; background: #999; margin: 0 auto 6px; }
    .pv-firma .fn { font-size: 12px; font-weight: bold; }
    .pv-firma .sub { font-size: 10.5px; color: #787878; line-height: 1.5; }
    .pv-footer {
      position: relative; z-index: 1; border-top: .75px solid #DDDDDD;
      margin: 0 46px; padding: 9px 0 16px; display: flex; align-items: center; justify-content: space-between;
      font-size: 10px; color: #787878;
    }
    .pv-footer .web { color: #009999; min-width: 200px; }
    .pv-footer .hash { flex: 1; text-align: center; font-size: 8px; color: #b8bcbe; }
    .pv-footer .pag { min-width: 90px; text-align: right; }
  `],
})
export class InformePdfPreviewComponent {
  /** Logo del encabezado. Vacío/null → sin logo. */
  @Input() headerSrc: string | null = null;
  /** Marca de agua de fondo. Vacío/null → sin watermark. */
  @Input() bgSrc: string | null = null;
  /** Enlace del pie de página. */
  @Input() footerLink = '';
  /** Leyenda de acreditación bajo el encabezado. */
  @Input() legend = '';
  /** Escala del A4 (sobrescribe el default .42 de la preview lateral; mayor = más grande). */
  @Input() scale = 0.42;

  /**
   * Firma del autorizante elegido (base64 PNG dataURL). Null/vacío → no se dibuja imagen.
   * Igual que el PDF: si el autorizante no tiene firma, la columna cae a "-".
   */
  @Input() authorizerSignatureSrc: string | null = null;
  /** Nombre del autorizante elegido. Vacío/null → "Autorizado por" muestra "-". */
  @Input() authorizerName: string | null = null;
  /** Matrícula del autorizante elegido. Vacío/null → no se muestra la línea M.P. */
  @Input() authorizerRegistration: string | null = null;

  /** Filas de ejemplo (fijas) del informe de muestra. */
  protected readonly rows = [
    { det: 'Glóbulos Rojos', num: '5.20', unit: ' 10⁶/µL', ref: '4.7 – 6.1' },
    { det: 'Hematocrito', num: '38.00', unit: ' %', ref: '41 – 53' },
    { det: 'Hemoglobina', num: '12.10', unit: ' g/dL', ref: '13.5 – 17.5' },
    { det: 'VCM', num: '90.00', unit: ' fL', ref: '80 – 100' },
    { det: 'HCM', num: '30.00', unit: ' pg', ref: '27 – 33' },
    { det: 'CHCM', num: '34.00', unit: ' g/dL', ref: '32 – 36' },
    { det: 'Glóbulos Blancos', num: '7.20', unit: ' 10³/µL', ref: '4.0 – 10.0' },
    { det: 'Plaquetas', num: '280.00', unit: ' 10³/µL', ref: '150 – 450' },
  ];
}
