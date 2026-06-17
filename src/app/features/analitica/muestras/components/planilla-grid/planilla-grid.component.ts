import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { PlanillaGrid, PlanillaCell } from '../../models/resultado.model';

/** Payload de guardado: por cada result, las determinaciones modificadas con valor. */
export interface PlanillaSavePayload {
  resultId: number;
  items: { determinationId: number; resultValue: string }[];
}

/**
 * GAP-P1/P5: grilla de carga de resultados desde una PLANILLA.
 * Bloques = análisis de la planilla; columnas = protocolos; filas = determinaciones.
 * Estructura/estilo basados en el mockup (worksheet-view). Las celdas sin
 * `determinationId`/`resultId` (la muestra no pidió el análisis) se ven pero no
 * persisten (GAP-P5): input deshabilitado.
 */
@Component({
  selector: 'app-planilla-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  templateUrl: './planilla-grid.component.html',
  styleUrl: './planilla-grid.component.scss',
})
export class PlanillaGridComponent {
  readonly grid = input.required<PlanillaGrid>();
  readonly save = output<PlanillaSavePayload[]>();

  /** Valores editados localmente: key `resultId:determinationId` → value. */
  private readonly edited = signal<ReadonlyMap<string, string>>(new Map());

  readonly columns = computed(() => this.grid().columns);

  cellKey(cell: PlanillaCell): string | null {
    if (cell.resultId == null || cell.determinationId == null) return null;
    return `${cell.resultId}:${cell.determinationId}`;
  }

  /** Una celda persiste solo si tiene result + determination reales (GAP-P5). */
  isPersistable(cell: PlanillaCell): boolean {
    return cell.resultId != null && cell.determinationId != null;
  }

  value(cell: PlanillaCell): string {
    const key = this.cellKey(cell);
    if (key == null) return cell.value;
    const e = this.edited().get(key);
    return e !== undefined ? e : cell.value;
  }

  filled(cell: PlanillaCell): boolean {
    return this.value(cell).trim() !== '';
  }

  setValue(cell: PlanillaCell, v: string): void {
    const key = this.cellKey(cell);
    if (key == null) return; // celda no persistible: no se registra cambio
    this.edited.update(m => new Map(m).set(key, v));
  }

  gridTemplateColumns(): string {
    return `minmax(220px, 1.1fr) repeat(${this.columns().length}, minmax(150px, 1fr))`;
  }

  /** Determinaciones cargadas / esperadas (solo celdas persistibles con valor). */
  readonly progreso = computed(() => {
    let total = 0, filled = 0;
    for (const sec of this.grid().sections) {
      for (const row of sec.rows) {
        for (const col of this.columns()) {
          const cell = row.cells[col.protocolId];
          if (!cell || !this.isPersistable(cell)) continue;
          total++;
          if (this.value(cell).trim() !== '') filled++;
        }
      }
    }
    return { total, filled };
  });

  onSave(): void {
    const byResult = new Map<number, { determinationId: number; resultValue: string }[]>();
    for (const [key, value] of this.edited()) {
      const [resultIdStr, detIdStr] = key.split(':');
      const resultId = Number(resultIdStr);
      const determinationId = Number(detIdStr);
      const arr = byResult.get(resultId) ?? [];
      arr.push({ determinationId, resultValue: value });
      byResult.set(resultId, arr);
    }
    const payload: PlanillaSavePayload[] = [...byResult.entries()].map(([resultId, items]) => ({ resultId, items }));
    this.save.emit(payload);
  }
}
