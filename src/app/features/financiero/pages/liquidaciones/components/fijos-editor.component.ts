import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { Analysis } from '@features/analitica/models/atencion.model';

/**
 * Fila editable del editor de valores fijos: un análisis de catálogo + monto plano en $
 * que reemplaza el cálculo por U.B./tramo para ESE análisis puntual, en el plan activo.
 */
export interface FixedAmountRow {
  analysisId: number | null;
  nombre: string;
  monto: number | null;
}

/**
 * Valida las filas de valores fijos: cada una necesita un análisis elegido, un monto > 0,
 * y el análisis no puede repetirse dentro del plan. Filas vacías (sin tocar) no son un
 * error en sí — el error aparece recién cuando se completó parcialmente una fila.
 * null = todo ok (incluye lista vacía: el editor es opcional).
 */
export function validateFijos(rows: FixedAmountRow[]): string | null {
  const seen = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.analysisId == null) return `Elegí un análisis para la fila ${i + 1} de valores fijos.`;
    if (r.monto == null || r.monto <= 0) return `El monto de la fila ${i + 1} debe ser mayor a 0.`;
    if (seen.has(r.analysisId)) return `El análisis "${r.nombre}" está repetido en los valores fijos.`;
    seen.add(r.analysisId);
  }
  return null;
}

/**
 * Mapea las filas válidas a `{analysisId: monto}` para el body del backend
 * (`fixedAmountsByPlan[planId]`). No valida — llamar después de `validateFijos(rows) === null`,
 * aunque también tolera filas incompletas (las descarta) para uso defensivo.
 */
export function fijosToMap(rows: FixedAmountRow[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const r of rows) {
    if (r.analysisId != null && r.monto != null && r.monto > 0) out[r.analysisId] = r.monto;
  }
  return out;
}

@Component({
  selector: 'fin-fijos-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule, InputNumberModule, ButtonModule],
  template: `
    <div class="liq-fijos">
      <span class="liq-fijos__title">Valores fijos por análisis (opcional)</span>
      <p class="liq-fijos__hint">Reemplaza el cálculo por tramo/U.B. para un análisis puntual de este plan por un monto fijo en pesos.</p>

      @if (rows().length) {
        <table class="liq-fijos__table" aria-label="Valores fijos por análisis del plan">
          <thead>
            <tr>
              <th scope="col">Análisis</th>
              <th scope="col">Monto fijo</th>
              <th scope="col"><span class="liq-fijos__sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track $index) {
              <tr>
                <td class="liq-fijos__analysis">
                  @if (r.analysisId != null) {
                    <div class="liq-fijos__chip">
                      <span>{{ r.nombre }}</span>
                      <button type="button" class="liq-fijos__chip-clear" aria-label="Cambiar análisis"
                              (click)="clearAnalysis($index)">
                        <i class="pi pi-times"></i>
                      </button>
                    </div>
                  } @else {
                    <p-autocomplete
                      [ngModel]="queryFor($index)"
                      [suggestions]="suggestions()"
                      (completeMethod)="onSearch($event)"
                      (onSelect)="onSelectAnalysis($index, $event)"
                      (ngModelChange)="onQueryChange($index, $event)"
                      [delay]="250"
                      [forceSelection]="false"
                      optionLabel="name"
                      placeholder="Código o nombre del análisis"
                      inputId="fijo-analisis-{{ $index }}">
                      <ng-template let-item pTemplate="item">
                        <div class="liq-fijos__item">
                          <span class="liq-fijos__item-code">{{ item.shortCode }}</span> — {{ item.name }}
                        </div>
                      </ng-template>
                    </p-autocomplete>
                  }
                </td>
                <td>
                  <p-inputNumber
                    [ngModel]="r.monto"
                    mode="currency"
                    currency="ARS"
                    locale="es-AR"
                    [min]="0"
                    inputId="fijo-monto-{{ $index }}"
                    (ngModelChange)="onMontoChange($index, $event)" />
                </td>
                <td>
                  <p-button
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    ariaLabel="Quitar valor fijo {{ $index + 1 }}"
                    (onClick)="removeRow($index)" />
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <p-button
        type="button"
        label="Agregar valor fijo"
        icon="pi pi-plus"
        severity="secondary"
        [text]="true"
        (onClick)="addRow()" />

      @if (error()) {
        <p class="liq-fijos__err" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: [`
    .liq-fijos { display: flex; flex-direction: column; gap: 8px; margin-top: var(--space-3, 12px); }
    .liq-fijos__title { font-size: 13px; font-weight: 600; color: var(--ds-text, #1a1a2e); }
    .liq-fijos__hint { font-size: 12px; color: var(--ds-text-muted, #64748b); margin: 0; }
    .liq-fijos__table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .liq-fijos__table th {
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      color: var(--ds-text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0 8px 8px;
    }
    .liq-fijos__table td { padding: 4px 8px; vertical-align: middle; }
    .liq-fijos__sr-only {
      position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
    }
    .liq-fijos__analysis { min-width: 220px; }
    .liq-fijos__chip {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px;
      background: var(--ds-surface, #f8fafc); border-radius: 7px; font-size: 13px;
    }
    .liq-fijos__chip-clear { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 0; }
    .liq-fijos__chip-clear:hover { color: #c0392b; }
    .liq-fijos__item { font-size: 13px; }
    .liq-fijos__item-code { font-family: 'Roboto Mono', monospace; color: #64748b; }
    .liq-fijos__err { font-size: 13px; color: var(--ds-danger, #d83a3a); margin: 4px 0 0; }
  `],
})
export class FijosEditorComponent {
  private readonly api = inject(AnalysisService);

  readonly rows = input.required<FixedAmountRow[]>();
  readonly rowsChange = output<FixedAmountRow[]>();

  protected readonly error = signal<string | null>(null);
  protected readonly suggestions = signal<Analysis[]>([]);
  /** Texto tipeado por fila mientras se busca (no persiste en `rows`; se descarta al elegir/borrar/agregar). */
  private readonly queries = signal<Record<number, string>>({});

  constructor() {
    effect(() => this.error.set(validateFijos(this.rows())));
  }

  protected queryFor(index: number): string {
    return this.queries()[index] ?? '';
  }

  protected onQueryChange(index: number, value: string | Analysis): void {
    this.queries.update((q) => ({ ...q, [index]: typeof value === 'string' ? value : '' }));
  }

  protected onSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim();
    if (!q) { this.suggestions.set([]); return; }
    const obs = /^\d+$/.test(q) ? this.api.searchByShortCodePrefix(q) : this.api.searchByName(q);
    obs.subscribe({
      next: (list) => this.suggestions.set(list ?? []),
      error: () => this.suggestions.set([]),
    });
  }

  protected onSelectAnalysis(index: number, e: AutoCompleteSelectEvent): void {
    const analysis = e.value as Analysis;
    const next = this.rows().map((r, i) => (i === index ? { ...r, analysisId: analysis.id, nombre: analysis.name } : r));
    this.queries.update((q) => { const c = { ...q }; delete c[index]; return c; });
    this.rowsChange.emit(next);
  }

  protected clearAnalysis(index: number): void {
    const next = this.rows().map((r, i) => (i === index ? { ...r, analysisId: null, nombre: '' } : r));
    this.rowsChange.emit(next);
  }

  protected onMontoChange(index: number, monto: number | null): void {
    const next = this.rows().map((r, i) => (i === index ? { ...r, monto } : r));
    this.rowsChange.emit(next);
  }

  protected addRow(): void {
    this.queries.set({});
    this.rowsChange.emit([...this.rows(), { analysisId: null, nombre: '', monto: null }]);
  }

  protected removeRow(index: number): void {
    this.queries.set({});
    this.rowsChange.emit(this.rows().filter((_, i) => i !== index));
  }
}
