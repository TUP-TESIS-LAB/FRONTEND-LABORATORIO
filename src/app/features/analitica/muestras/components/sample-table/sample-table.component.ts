import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Sample } from '../../models/sample.model';
import type { ScreenKey } from '../../models/transition.model';
import type { Tube } from '../../models/tube.model';

const STATE_LABELS: Record<Sample['state'], string> = {
  collected: 'Recolectada',
  transito: 'En tránsito',
  processing: 'En proceso',
  completed: 'Completada',
  derived: 'Derivada',
  rejected: 'Rechazada',
  lost: 'Perdida',
  discarded: 'Descartada',
};

const STATE_COLORS: Record<Sample['state'], string> = {
  collected: 'blue',
  transito: 'green',
  processing: 'amber',
  completed: 'green',
  derived: 'purple',
  rejected: 'red',
  lost: 'amber',
  discarded: 'slate',
};

@Component({
  selector: 'app-muestras-sample-table',
  standalone: true,
  templateUrl: './sample-table.component.html',
  styleUrl: './sample-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleTableComponent {
  readonly rows = input.required<Sample[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly leavingIds = input<ReadonlySet<string>>(new Set());
  readonly flashId = input<string | null>(null);
  readonly screenKey = input.required<ScreenKey>();

  readonly toggleRow = output<string>();
  readonly toggleAll = output<void>();

  /** Ids de filas con el panel de análisis abierto. */
  readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  readonly ordered = computed(() => {
    const sel = this.selectedIds();
    const all = this.rows();
    const selected = all.filter(r => sel.has(r.id));
    const rest = all.filter(r => !sel.has(r.id));
    return [...selected, ...rest];
  });

  readonly allVisibleSelected = computed(() => {
    const rs = this.rows();
    if (rs.length === 0) return false;
    const sel = this.selectedIds();
    return rs.every(r => sel.has(r.id));
  });

  readonly sucursalHeader = computed(() =>
    this.screenKey() === 'traslado' ? 'Origen' : 'Sucursal/sede',
  );

  stateLabel(s: Sample['state']): string { return STATE_LABELS[s]; }
  stateColor(s: Sample['state']): string { return STATE_COLORS[s]; }

  isSelected(id: string): boolean { return this.selectedIds().has(id); }
  isLeaving(id: string): boolean { return this.leavingIds().has(id); }
  isFlashing(id: string): boolean { return this.flashId() === id; }
  isExpanded(id: string): boolean { return this.expandedIds().has(id); }

  /** Devuelve los análisis si la fila es un Tube con más de uno, null en caso contrario. */
  tubeAnalyses(row: Sample): Tube['analyses'] | null {
    const t = row as Tube;
    return t.analyses?.length > 1 ? t.analyses : null;
  }

  toggleExpansion(id: string, event: Event): void {
    event.stopPropagation();
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
