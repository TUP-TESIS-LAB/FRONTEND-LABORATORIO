import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import type { ProtocoloProgreso } from '../../services/procesamiento-progreso.service';

/** Fila del modal: progreso de una muestra/protocolo seleccionado + su rótulo. */
export interface ResumenMuestra extends ProtocoloProgreso {
  code: string;
  patient: string;
}

/**
 * GAP-P2: modal "¿dar por completados los análisis?" de la pantalla de Procesamiento.
 * Resumen de las muestras seleccionadas (completas / parciales / sin resultados),
 * con warning para las sin resultados, tabla de selección y "Marcar completadas".
 * Fiel al mockup (sin la barra de progreso, por decisión del usuario).
 * Se pueden marcar las muestras con al menos un valor cargado (completas y parciales);
 * las "sin resultados" quedan en análisis.
 */
@Component({
  selector: 'app-marcar-completadas-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule],
  templateUrl: './marcar-completadas-modal.component.html',
  styleUrl: './marcar-completadas-modal.component.scss',
})
export class MarcarCompletadasModalComponent {
  readonly visible = input<boolean>(false);
  readonly items = input<ResumenMuestra[]>([]);

  /** Emite los resultIds de las muestras elegidas para marcar completadas. */
  readonly marcar = output<number[]>();
  readonly closed = output<void>();

  /** Selección por protocolId (solo las completables). */
  readonly checked = signal<ReadonlySet<number>>(new Set());

  readonly completas = computed(() => this.items().filter(i => i.status === 'completa'));
  readonly parciales = computed(() => this.items().filter(i => i.status === 'parcial'));
  readonly sin = computed(() => this.items().filter(i => i.status === 'sin'));
  private readonly seleccionables = computed(() => this.items().filter(i => i.status !== 'sin'));

  readonly allSel = computed(() => {
    const s = this.seleccionables();
    return s.length > 0 && s.every(i => this.checked().has(i.protocolId));
  });

  estado(i: ResumenMuestra): [string, string] {
    if (i.status === 'completa') return ['st-ok', 'Completa'];
    if (i.status === 'parcial') return ['st-mid', 'Parcial'];
    return ['st-no', 'Sin resultados'];
  }
  isSelectable(i: ResumenMuestra): boolean { return i.status !== 'sin'; }
  isChecked(i: ResumenMuestra): boolean { return this.checked().has(i.protocolId); }

  toggle(i: ResumenMuestra): void {
    if (!this.isSelectable(i)) return;
    this.checked.update(prev => { const n = new Set(prev); n.has(i.protocolId) ? n.delete(i.protocolId) : n.add(i.protocolId); return n; });
  }
  toggleAll(): void {
    this.checked.set(this.allSel() ? new Set() : new Set(this.seleccionables().map(i => i.protocolId)));
  }

  onClose(): void { this.closed.emit(); }
  onMarcar(): void {
    const sel = new Set(this.checked());
    const resultIds = this.items().filter(i => sel.has(i.protocolId)).flatMap(i => i.resultIds);
    this.marcar.emit(resultIds);
  }
}
