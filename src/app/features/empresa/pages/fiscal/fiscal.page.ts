import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { loadFiscalStatus } from '../../store/empresa.actions';
import {
  selectFiscalPending, selectFiscalStatus, selectFiscalUnavailable,
} from '../../store/empresa.selectors';

/** Situación en la que está el laboratorio, ya resuelta para no meter lógica en el template. */
type Situacion = 'emitiendo' | 'emitiendo-en-pruebas' | 'incompleta' | 'inactiva';

@Component({
  selector: 'emp-fiscal-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-fiscal">
      @if (cargando()) {
        <p class="ui-text-muted">Consultando el estado de la facturación...</p>
      } @else if (noDisponible()) {
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Facturación electrónica</span></div>
          <p>No pudimos consultar el estado de la facturación en este momento.</p>
          <p class="ui-text-sm ui-text-muted">
            Volvé a entrar en unos minutos. Si sigue igual, avisale al equipo del sistema.
          </p>
        </section>
      } @else {

        <section class="emp-fiscal__estado"
                 [class.emp-fiscal__estado--ok]="tono() === 'ok'"
                 [class.emp-fiscal__estado--aviso]="tono() === 'aviso'"
                 [class.emp-fiscal__estado--info]="tono() === 'info'">
          <i [class]="'pi ' + icono()"></i>
          <div>
            <h3>{{ titulo() }}</h3>
            <p>{{ bajada() }}</p>
          </div>
        </section>

        @if (faltantes().length > 0) {
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Qué falta para activarla</span></div>
            <ul class="emp-fiscal__faltantes">
              @for (item of faltantes(); track item) {
                <li><i class="pi pi-circle-off"></i>{{ item }}</li>
              }
            </ul>
            <p class="ui-text-sm ui-text-muted">
              El certificado digital lo emite ARCA después de un trámite ante el organismo. El
              resto son datos del laboratorio que se cargan una sola vez.
            </p>
          </section>
        }

        @if (!estaEmitiendo()) {
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Mientras tanto, cada cobro emite Factura X</span></div>
            <p>
              La Factura X es un comprobante interno, numerado y correlativo, que le queda al
              paciente como respaldo del pago. No es un comprobante fiscal y no se informa a ARCA.
            </p>
            <p class="ui-text-sm ui-text-muted">
              El sistema la emite automáticamente: no tenés que hacer nada ni hay nada roto.
            </p>
          </section>
        }

        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Quién configura esto</span></div>
          <p>
            La configuración fiscal la carga el equipo del sistema, no se edita desde esta
            pantalla. Si necesitás activar la facturación electrónica o cambiar algún dato,
            pedíselo junto con la documentación que figura arriba.
          </p>
        </section>
      }
    </div>
  `,
  styles: [`
    .emp-fiscal { display: flex; flex-direction: column; gap: var(--space-5); }
    @media (min-width: 1024px) { .emp-fiscal { max-width: 720px; } }
    .emp-fiscal p { margin: 0 0 var(--space-2); }
    .emp-fiscal p:last-child { margin-bottom: 0; }

    .emp-fiscal__estado {
      display: flex; gap: var(--space-4); align-items: flex-start;
      padding: var(--space-5); border-radius: 12px; border: 1px solid;
    }
    .emp-fiscal__estado h3 { margin: 0 0 var(--space-2); font-size: 17px; }
    .emp-fiscal__estado i { font-size: 24px; margin-top: 2px; }
    .emp-fiscal__estado--ok    { background: #e6f6ec; border-color: #a8dcbb; color: #1c6b3a; }
    .emp-fiscal__estado--aviso { background: #fcf1dd; border-color: #e9cc92; color: #8a5a06; }
    .emp-fiscal__estado--info  { background: #e8f0fe; border-color: #b6cdf7; color: #1a4f9c; }

    .emp-fiscal__faltantes { list-style: none; margin: 0 0 var(--space-3); padding: 0; }
    .emp-fiscal__faltantes li {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) 0; border-bottom: 1px solid var(--ds-surface);
    }
    .emp-fiscal__faltantes li:last-child { border-bottom: none; }
    .emp-fiscal__faltantes i { font-size: 12px; color: var(--ds-warning); }
  `],
})
export class FiscalPage implements OnInit {
  private readonly store = inject(Store);

  private readonly status = this.store.selectSignal(selectFiscalStatus);
  protected readonly cargando = this.store.selectSignal(selectFiscalPending);
  protected readonly noDisponible = this.store.selectSignal(selectFiscalUnavailable);

  protected readonly faltantes = computed(() => this.status()?.missingFields ?? []);
  protected readonly estaEmitiendo = computed(() => this.status()?.readyToInvoice ?? false);

  private readonly situacion = computed<Situacion>(() => {
    const s = this.status();
    if (!s) return 'inactiva';
    if (s.readyToInvoice) {
      // Homologación es el ambiente de prueba de ARCA: emite, pero sin validez fiscal. Mezclarlo
      // con producción en un mismo cartel verde es justo el malentendido que hay que evitar.
      return s.environment === 'HOMO' ? 'emitiendo-en-pruebas' : 'emitiendo';
    }
    return s.electronicInvoicingEnabled ? 'incompleta' : 'inactiva';
  });

  protected readonly tono = computed(() => {
    switch (this.situacion()) {
      case 'emitiendo': return 'ok';
      case 'emitiendo-en-pruebas': return 'info';
      default: return 'aviso';
    }
  });

  protected readonly icono = computed(() => {
    switch (this.situacion()) {
      case 'emitiendo': return 'pi-check-circle';
      case 'emitiendo-en-pruebas': return 'pi-info-circle';
      default: return 'pi-exclamation-triangle';
    }
  });

  protected readonly titulo = computed(() => {
    switch (this.situacion()) {
      case 'emitiendo':
        return 'Estás emitiendo facturas electrónicas';
      case 'emitiendo-en-pruebas':
        return 'Estás emitiendo en modo de prueba';
      case 'incompleta':
        return 'La facturación electrónica está a medio configurar';
      default:
        return 'Todavía no estás emitiendo facturas electrónicas';
    }
  });

  protected readonly bajada = computed(() => {
    switch (this.situacion()) {
      case 'emitiendo':
        return 'Los cobros generan comprobantes fiscales informados a ARCA.';
      case 'emitiendo-en-pruebas':
        return 'Los comprobantes se generan contra el ambiente de prueba de ARCA, así que NO '
          + 'tienen validez fiscal. Sirve para verificar que todo funcione antes de pasar a '
          + 'facturar en serio.';
      case 'incompleta':
        return 'El laboratorio ya está anotado para facturar electrónicamente, pero falta '
          + 'completar algunos requisitos antes de que pueda emitir.';
      default:
        return this.faltantes().length > 0
          ? 'Para activarla hay que reunir algunos datos y el certificado de ARCA.'
          : 'Los datos del laboratorio ya están cargados: solo falta que el equipo del sistema '
            + 'active la emisión electrónica.';
    }
  });

  ngOnInit(): void {
    this.store.dispatch(loadFiscalStatus());
  }
}
