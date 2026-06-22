import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { esPendiente, type DetalleResultado } from '../../models/postanalitica.model';

/**
 * GAP-9: modal de confirmación de "Firmar estudio".
 *
 * Muestra el resumen de los análisis/resultados del estudio con su estado de
 * validación y, según falten o no resultados por validar, anticipa si la firma
 * será PARCIAL (el estudio queda PARTIALLY_SIGNED) o TOTAL (se cierra el estudio).
 *
 * Sigue el patrón visual estándar de los modales de confirmación (p-dialog modal, no
 * draggable, fullscreen en mobile, footer con dos p-button).
 */
@Component({
  selector: 'app-firmar-estudio-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onClose()" [modal]="true" [draggable]="false"
              [style]="{ width: '560px' }" [breakpoints]="{ '768px': '100vw' }"
              styleClass="ui-dialog-fullscreen-mobile" header="Firmar estudio">
      <p class="fe-lead">
        @if (esTotal()) {
          Todos los análisis están validados. Al confirmar se firmarán y el estudio quedará
          <b>cerrado (firma total)</b>.
        } @else if (hayPendientes()) {
          Hay análisis <b>sin resultado todavía</b> (su muestra está en proceso). Al confirmar se firmarán solo
          los validados y el estudio quedará en <b>firma parcial</b>; el resto podrá firmarse cuando se carguen.
        } @else {
          Hay análisis sin validar. Al confirmar se firmarán solo los validados y el estudio quedará en
          <b>firma parcial</b>; los pendientes podrán firmarse después.
        }
      </p>

      <div class="fe-list">
        @for (r of results(); track esPendiente(r) ? ('p-' + $index + '-' + (r.analysisName ?? '')) : ('r-' + r.resultId)) {
          <div class="fe-row">
            <span class="fe-name">{{ r.analysisName ?? ('Resultado #' + r.resultId) }}</span>
            <span class="fe-state" [class.is-ok]="esFirmable(r)" [class.is-pending]="!esFirmable(r)">
              {{ etiqueta(r) }}
            </span>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="onClose()" />
        <p-button [label]="esTotal() ? 'Firmar y cerrar' : 'Firmar parcial'"
                  [disabled]="firmablesCount() === 0" (onClick)="onConfirm()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .fe-lead { font-size: 13.5px; color: #5b6276; margin: 0 0 14px; }
    .fe-lead b { color: #1a2140; }
    .fe-list { display: flex; flex-direction: column; border: 1px solid #eceef3; border-radius: 10px; overflow: hidden; }
    .fe-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border-bottom: 1px solid #f1f2f6; }
    .fe-row:last-child { border-bottom: none; }
    .fe-name { font-size: 13.5px; color: #1a2140; font-weight: 600; }
    .fe-state { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
    .fe-state.is-ok { color: #15803d; background: #dcfce7; }
    .fe-state.is-pending { color: #b45309; background: #fef3c7; }
  `],
})
export class FirmarEstudioModalComponent {
  readonly visible = input<boolean>(false);
  readonly results = input<DetalleResultado[]>([]);

  readonly confirmar = output<void>();
  readonly closed = output<void>();

  readonly esPendiente = esPendiente;

  /**
   * Un resultado es firmable si ya está validado (o firmado, que cuenta como hecho).
   * Un PENDIENTE nunca es firmable (no tiene resultado todavía).
   */
  esFirmable(r: DetalleResultado): boolean {
    if (esPendiente(r)) return false;
    return r.status === 'VALIDATED' || r.status === 'SIGNED';
  }
  /** Hay al menos un análisis pendiente (sin resultado): nunca puede ser firma total. */
  readonly hayPendientes = computed(() => this.results().some(r => esPendiente(r)));
  /** Firmables = sólo NO-pendientes en estado VALIDATED (los pendientes no cuentan). */
  readonly firmablesCount = computed(() =>
    this.results().filter(r => !esPendiente(r) && r.status === 'VALIDATED').length);
  /**
   * Es firma TOTAL sólo si NO hay pendientes Y todos los NO-pendientes son firmables
   * (y hay al menos uno). Con cualquier pendiente → firma parcial.
   */
  readonly esTotal = computed(() => {
    if (this.hayPendientes()) return false;
    const noPendientes = this.results().filter(r => !esPendiente(r));
    return noPendientes.length > 0 && noPendientes.every(r => this.esFirmable(r));
  });

  etiqueta(r: DetalleResultado): string {
    if (esPendiente(r)) return 'Sin resultado';
    if (r.status === 'SIGNED') return 'Firmado';
    if (r.status === 'VALIDATED') return 'Listo para firmar';
    return 'Sin validar';
  }

  onConfirm(): void { this.confirmar.emit(); }
  onClose(): void { this.closed.emit(); }
}
