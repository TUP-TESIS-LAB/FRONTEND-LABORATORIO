import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Sample } from '../../models/sample.model';
import type { RowActionKey, ScreenKey } from '../../models/transition.model';
import type { Tube } from '../../models/tube.model';
import { rowActionsFor } from '../../data/state-machine.config';
import { DateEsPipe } from '@shared/pipes/date-es.pipe';
import { RowActionsMenuComponent } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';

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
  imports: [DateEsPipe, RowActionsMenuComponent],
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
  readonly rowAction = output<{ key: RowActionKey; row: Sample }>();

  /** Acciones del menú por-fila, derivadas de la config de la pantalla. */
  readonly rowMenuActions = computed(() => rowActionsFor(this.screenKey()));

  emitRowAction(key: string, row: Sample): void {
    this.rowAction.emit({ key: key as RowActionKey, row });
  }

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

  /**
   * Devuelve los análisis si la fila es un Tube expandible:
   * - más de un análisis, O
   * - tiene rejectionReason (para mostrar el motivo de rechazo).
   */
  tubeAnalyses(row: Sample): Tube['analyses'] | null {
    const t = row as Tube;
    if (!t.analyses?.length) return null;
    return (t.analyses.length > 1 || !!t.rejectionReason) ? t.analyses : null;
  }

  /** Devuelve el motivo de rechazo/descarte si existe. */
  rejectionReason(row: Sample): string | null {
    return (row as Tube).rejectionReason ?? null;
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
