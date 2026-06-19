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
 * Estructura/estilo basados en el mockup (worksheet-view).
 *
 * Todas las celdas se ven y se editan igual (sin marcas ni bloqueos). GAP-P5: si la
 * celda no tiene `determinationId`/`resultId` (el protocolo no solicitó ese análisis),
 * al guardar simplemente NO se incluye en el payload — el backend nunca la recibe. El
 * front no decide qué se escribe; el valor "no correspondiente" se ignora de forma
 * natural por no tener dónde persistir.
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

  /** Valores editados localmente, por identidad de celda `protocolId:catalogId`. */
  private readonly edited = signal<ReadonlyMap<string, string>>(new Map());

  readonly columns = computed(() => this.grid().columns);

  private localKey(protocolId: number, catalogId: number): string { return `${protocolId}:${catalogId}`; }

  value(protocolId: number, catalogId: number, cell: PlanillaCell): string {
    const e = this.edited().get(this.localKey(protocolId, catalogId));
    return e !== undefined ? e : cell.value;
  }

  filled(protocolId: number, catalogId: number, cell: PlanillaCell): boolean {
    return this.value(protocolId, catalogId, cell).trim() !== '';
  }

  /** Toda celda es editable; el valor se guarda en estado local sin importar si persiste. */
  setValue(protocolId: number, catalogId: number, v: string): void {
    this.edited.update(m => new Map(m).set(this.localKey(protocolId, catalogId), v));
  }

  gridTemplateColumns(): string {
    return `minmax(220px, 1.1fr) repeat(${this.columns().length}, minmax(150px, 1fr))`;
  }

  /** Progreso: solo cuentan las celdas que SÍ corresponden (tienen determinación real). */
  readonly progreso = computed(() => {
    let total = 0, filled = 0;
    for (const sec of this.grid().sections) {
      for (const row of sec.rows) {
        for (const col of this.columns()) {
          const cell = row.cells[col.protocolId];
          if (!cell || cell.resultId == null || cell.determinationId == null) continue;
          total++;
          if (this.value(col.protocolId, row.catalogId, cell).trim() !== '') filled++;
        }
      }
    }
    return { total, filled };
  });

  onSave(): void {
    // Solo se mandan las celdas que corresponden (tienen result+determination).
    // Las que el protocolo no solicitó no entran al payload → el back no las recibe.
    const byResult = new Map<number, { determinationId: number; resultValue: string }[]>();
    for (const sec of this.grid().sections) {
      for (const row of sec.rows) {
        for (const col of this.columns()) {
          const cell = row.cells[col.protocolId];
          if (!cell || cell.resultId == null || cell.determinationId == null) continue;
          const edited = this.edited().get(this.localKey(col.protocolId, row.catalogId));
          if (edited === undefined) continue; // sin cambios → no se manda
          const arr = byResult.get(cell.resultId) ?? [];
          arr.push({ determinationId: cell.determinationId, resultValue: edited });
          byResult.set(cell.resultId, arr);
        }
      }
    }
    const payload: PlanillaSavePayload[] = [...byResult.entries()].map(([resultId, items]) => ({ resultId, items }));
    this.save.emit(payload);
  }
}
