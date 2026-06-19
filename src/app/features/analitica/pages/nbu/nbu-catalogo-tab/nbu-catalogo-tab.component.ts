import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { CatalogRow, Determination } from '../../../models/nomenclador.model';
import { loadDeterminations } from '../../../store/nomenclador/nomenclador.actions';
import { selectCatalogRows, selectDeterminations } from '../../../store/nomenclador/nomenclador.selectors';

/**
 * Tab "Catálogo de análisis" de la pantalla NBU (KAN-118, task 5).
 *
 * Muestra la tabla de análisis con fila expandible que carga las determinaciones
 * de forma lazy: la primera expansión despacha loadDeterminations; las siguientes
 * reutilizan lo que ya hay en el store.
 */
@Component({
  selector: 'lab-nbu-catalogo-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-[var(--ds-border,#e4e4e7)] text-xs text-[var(--ds-text-muted,#71717a)] uppercase">
          <tr>
            <th class="px-3 py-2 text-left">Código</th>
            <th class="px-3 py-2 text-left">Análisis</th>
            <th class="px-3 py-2 text-left">Familia</th>
            <th class="px-3 py-2 text-left">Cód. NBU</th>
            <th class="px-3 py-2 text-right">Cantidad U.B.</th>
            <th class="px-3 py-2 text-center">Determinaciones</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="border-b border-[var(--ds-border,#e4e4e7)] hover:bg-[var(--ds-surface-alt,#f4f4f5)]">
              <td class="px-3 py-2 font-mono font-medium">{{ row.shortCode }}</td>
              <td class="px-3 py-2">{{ row.name }}</td>
              <td class="px-3 py-2 text-[var(--ds-text-muted,#71717a)]">{{ row.familyName ?? '—' }}</td>
              <td class="px-3 py-2 text-[var(--ds-text-muted,#71717a)]">{{ row.nbuCode ?? '—' }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ row.cantidadUb ?? '—' }}</td>
              <td class="px-3 py-2 text-center">
                <button
                  type="button"
                  data-testid="expand-btn"
                  class="inline-flex items-center gap-1 text-xs text-[var(--brand-primary,#4f46e5)] hover:underline"
                  [attr.aria-expanded]="isExpanded(row.id)"
                  (click)="toggleRow(row)"
                >
                  <i class="pi text-[10px]"
                     [class.pi-chevron-right]="!isExpanded(row.id)"
                     [class.pi-chevron-down]="isExpanded(row.id)"></i>
                  Ver
                </button>
              </td>
            </tr>
            @if (isExpanded(row.id)) {
              <tr class="expansion-row bg-[var(--ds-surface-alt,#f9f9f9)]">
                <td colspan="6" class="px-6 py-3">
                  @let dets = determinationsFor(row.id);
                  @if (dets === null) {
                    <span class="text-xs text-[var(--ds-text-muted,#71717a)] italic">Cargando…</span>
                  } @else if (dets.length === 0) {
                    <span class="text-xs text-[var(--ds-text-muted,#71717a)]">Sin determinaciones</span>
                  } @else {
                    <ul class="flex flex-wrap gap-2">
                      @for (det of dets; track det.id) {
                        <li class="text-xs bg-white border border-[var(--ds-border,#e4e4e7)] rounded px-2 py-0.5">
                          {{ det.name }}
                        </li>
                      }
                    </ul>
                  }
                </td>
              </tr>
            }
          } @empty {
            <tr>
              <td colspan="6" class="px-3 py-8 text-center text-sm text-[var(--ds-text-muted,#71717a)]">
                Sin análisis en el catálogo.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class NbuCatalogoTabComponent {
  private readonly store = inject(Store);

  /** Filas del catálogo con cantidadUb resuelta para la versión seleccionada. */
  protected readonly rows = this.store.selectSignal(selectCatalogRows);

  /** IDs de filas actualmente expandidas. */
  private readonly expandedIds = signal<Set<number>>(new Set());

  /**
   * IDs para los que ya se despachó loadDeterminations (evita re-despachos al
   * colapsar y re-expandir la misma fila).
   */
  private readonly loadedIds = new Set<number>();

  /** Caché de signals por analysisId para no crear un nuevo selector en cada render. */
  private readonly detSignals = new Map<number, ReturnType<typeof this.store.selectSignal>>();

  protected isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  /**
   * Devuelve las determinaciones para un analysisId directamente desde el store.
   * null = no cargado, [] = cargado sin datos, Determination[] = cargado con datos.
   */
  protected determinationsFor(id: number): Determination[] | null {
    if (!this.detSignals.has(id)) {
      this.detSignals.set(id, this.store.selectSignal(selectDeterminations(id)));
    }
    return (this.detSignals.get(id) as () => Determination[] | null)();
  }

  protected toggleRow(row: CatalogRow): void {
    const id = row.id;
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazy-load: solo despachar la primera vez
        if (!this.loadedIds.has(id)) {
          this.loadedIds.add(id);
          this.store.dispatch(loadDeterminations({ analysisId: id }));
        }
      }
      return next;
    });
  }
}
