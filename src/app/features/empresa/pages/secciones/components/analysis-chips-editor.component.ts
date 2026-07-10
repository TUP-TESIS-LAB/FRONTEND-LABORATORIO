import {
  ChangeDetectionStrategy, Component, computed, inject, model, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';

import { Analysis } from '@features/analitica/models/atencion.model';
import { AnalysisChip } from '../../../models/analysis-chip.model';
import { AnalysisService } from '@features/analitica/services/analysis.service';

/**
 * Editor de los análisis asignados a una sección (KAN-218).
 *
 * Chips propios (no el modo `[multiple]` nativo de p-autoComplete): el multiple nativo
 * ata los tokens al ngModel del combo y sólo modela objetos seleccionados, pero acá
 * necesitamos chips en dos estados (found / notfound) — los notfound vienen de pegar una
 * lista y no existen en el catálogo, así que no pueden ser "valores seleccionados" del combo.
 * Por eso: p-autoComplete simple para buscar + agregar, y una fila de chips propia debajo
 * que renderiza ambos estados y permite quitarlos.
 */
@Component({
  selector: 'emp-analysis-chips-editor',
  standalone: true,
  imports: [FormsModule, AutoCompleteModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ace">
      <p-autocomplete
        [(ngModel)]="autoModel"
        [suggestions]="suggestions()"
        (completeMethod)="onSearch($event)"
        (onSelect)="onSelect($event)"
        [delay]="250"
        [forceSelection]="false"
        [minLength]="1"
        optionLabel="name"
        placeholder="Buscá por nombre o código, o pegá una lista"
        styleClass="ace__input"
        (paste)="onPaste($event)">
        <ng-template let-item pTemplate="item">
          <span class="ace__opt-code">{{ item.shortCode }}</span> — {{ item.name }}
        </ng-template>
      </p-autocomplete>

      @if (chips().length) {
        <div class="ace__chips">
          @for (chip of chips(); track $index) {
            <p-tag
              [value]="chip.name"
              [severity]="chip.state === 'notfound' ? 'danger' : 'info'"
              [rounded]="true"
              class="ace__chip"
              [class.ace__chip--notfound]="chip.state === 'notfound'">
            </p-tag>
            <button
              type="button"
              class="ace__chip-x"
              [attr.aria-label]="'Quitar ' + chip.name"
              (click)="remove($index)">×</button>
          }
        </div>
      } @else {
        <p class="ace__empty">Sin análisis asignados.</p>
      }

      @if (notFoundCount() > 0) {
        <p class="ace__warn">
          {{ notFoundCount() }} análisis pegados no existen en el catálogo del tenant y no se guardarán.
        </p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ace { display: flex; flex-direction: column; gap: var(--space-3); }
    .ace ::ng-deep .ace__input { width: 100%; }
    .ace ::ng-deep .ace__input .p-autocomplete-input { width: 100%; }
    .ace__opt-code { font-family: monospace; opacity: .8; }
    .ace__chips { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
    .ace__chip-x {
      border: none; background: transparent; cursor: pointer;
      color: var(--ds-text-muted); font-size: 16px; line-height: 1;
      padding: 0 var(--space-2) 0 2px; margin-left: -8px;
    }
    .ace__chip-x:hover { color: var(--ds-danger, #e23a47); }
    .ace__empty { font-size: 13px; color: var(--ds-text-muted); margin: 0; }
    .ace__warn { font-size: 12px; color: var(--ds-danger, #e23a47); margin: 0; }
  `],
})
export class AnalysisChipsEditorComponent {
  private readonly api = inject(AnalysisService);

  /** Chips actuales (two-way). El drawer los lee y setea al abrir en modo editar. */
  readonly value = model<AnalysisChip[]>([]);

  protected autoModel: string | Analysis = '';
  protected readonly suggestions = signal<Analysis[]>([]);

  protected readonly chips = computed(() => this.value());
  protected readonly notFoundCount = computed(
    () => this.value().filter((c) => c.state === 'notfound').length,
  );

  /** Ids de los análisis realmente asignables (found con id). Lo usa el drawer al guardar. */
  analysisIds(): number[] {
    return this.value()
      .filter((c) => c.state === 'found' && c.analysisId != null)
      .map((c) => c.analysisId as number);
  }

  onSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim();
    if (!q) { this.suggestions.set([]); return; }
    const obs = /^\d+$/.test(q)
      ? this.api.searchByShortCodePrefix(q)
      : this.api.searchByName(q);
    obs.subscribe({
      next: (list) => this.suggestions.set(list ?? []),
      error: () => this.suggestions.set([]),
    });
  }

  onSelect(e: AutoCompleteSelectEvent): void {
    const a = e.value as Analysis;
    this.addFound(a.id, a.name);
    this.autoModel = '';
    this.suggestions.set([]);
  }

  /**
   * Pegar-lista: si el texto pegado tiene separadores (`,` / `;` / salto de línea),
   * lo interceptamos, cortamos en nombres y los resolvemos en batch contra el catálogo.
   * Un solo token sin separadores se deja al flujo normal del autocomplete.
   */
  onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!/[,;\n]/.test(text)) return;
    e.preventDefault();
    const names = text
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (!names.length) return;

    this.api.resolveByNames(names).subscribe({
      next: (resolved) => {
        for (const r of resolved) {
          if (r.matched && r.analysisId != null) {
            this.addFound(r.analysisId, r.name);
          } else {
            this.addNotFound(r.name);
          }
        }
      },
    });
    this.autoModel = '';
  }

  remove(index: number): void {
    this.value.update((arr) => arr.filter((_, i) => i !== index));
  }

  private addFound(analysisId: number, name: string): void {
    if (this.value().some((c) => c.analysisId === analysisId)) return;
    this.value.update((arr) => [...arr, { analysisId, name, state: 'found' as const }]);
  }

  private addNotFound(name: string): void {
    if (this.value().some((c) => c.state === 'notfound' && c.name === name)) return;
    this.value.update((arr) => [...arr, { analysisId: null, name, state: 'notfound' as const }]);
  }
}
