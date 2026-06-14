import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ResultGrid } from '../../models/resultado.model';
import type { BatchDeterminationItem } from '../../services/resultados-api.service';

export interface SaveResultPayload { resultId: number; items: BatchDeterminationItem[]; }

@Component({
  selector: 'app-result-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      @for (sec of grid().sections; track sec.analysisCatalogId) {
        <section class="border rounded">
          <header class="px-3 py-2 bg-gray-50 font-semibold text-sm">{{ sec.analysisName }}</header>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left p-2">Determinación</th>
                  @for (rid of sec.resultIds; track rid) { <th class="p-2">{{ grid().resultLabels[rid] ?? ('#' + rid) }}</th> }
                </tr>
              </thead>
              <tbody>
                @for (row of sec.rows; track row.catalogId) {
                  <tr>
                    <td class="p-2">{{ row.name }}@if (row.unit) { <small class="opacity-60"> ({{ row.unit }})</small> }</td>
                    @for (rid of sec.resultIds; track rid) {
                      <td class="p-1">
                        @if (row.cells[rid]; as cell) {
                          <input class="w-full border rounded p-1 text-center" [ngModel]="valueOf(rid, row.catalogId)"
                                 (ngModelChange)="setValue(rid, row.catalogId, $event)" placeholder="—"
                                 [attr.aria-label]="row.name + ' · ' + (grid().resultLabels[rid] ?? ('#' + rid))" />
                        } @else { <span class="opacity-30">—</span> }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      @if (!grid().sections.length) {
        <p class="text-sm opacity-60">No hay resultados cargables para los protocolos seleccionados.</p>
      }
      <div class="flex justify-end">
        <button type="button" class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold"
                [disabled]="!grid().sections.length" (click)="onSave()">
          <i class="pi pi-check"></i> Guardar y revisar
        </button>
      </div>
    </div>
  `,
})
export class ResultGridComponent {
  readonly grid = input.required<ResultGrid>();
  readonly save = output<SaveResultPayload[]>();

  private readonly values = signal<Record<number, Record<number, string>>>({});
  private readonly dirty = signal<Set<string>>(new Set());
  private readonly detIdByCell = computed(() => {
    const map: Record<string, number> = {};
    for (const sec of this.grid().sections)
      for (const row of sec.rows)
        for (const rid of sec.resultIds) {
          const cell = row.cells[rid];
          if (cell) map[`${rid}:${row.catalogId}`] = cell.determinationId;
        }
    return map;
  });

  constructor() {
    effect(() => { this.grid(); this.seed(); });
  }

  private seed(): void {
    const v: Record<number, Record<number, string>> = {};
    for (const sec of this.grid().sections)
      for (const row of sec.rows)
        for (const rid of sec.resultIds) {
          const cell = row.cells[rid];
          if (cell) { (v[rid] ??= {})[row.catalogId] = cell.value; }
        }
    this.values.set(v);
    this.dirty.set(new Set());
  }

  valueOf(resultId: number, catalogId: number): string { return this.values()[resultId]?.[catalogId] ?? ''; }

  setValue(resultId: number, catalogId: number, value: string): void {
    this.values.update(v => ({ ...v, [resultId]: { ...(v[resultId] ?? {}), [catalogId]: value } }));
    this.dirty.update(s => new Set(s).add(`${resultId}:${catalogId}`));
  }

  buildPayload(): SaveResultPayload[] {
    const byResult = new Map<number, BatchDeterminationItem[]>();
    const detIds = this.detIdByCell();
    for (const key of this.dirty()) {
      const [ridStr, catStr] = key.split(':');
      const rid = Number(ridStr), cat = Number(catStr);
      const value = this.valueOf(rid, cat).trim();
      if (!value) continue;
      const determinationId = detIds[key];
      if (determinationId == null) continue;
      const arr = byResult.get(rid) ?? [];
      arr.push({ determinationId, resultValue: value, observations: null });
      byResult.set(rid, arr);
    }
    return [...byResult.entries()].map(([resultId, items]) => ({ resultId, items }));
  }

  onSave(): void { this.save.emit(this.buildPayload()); }
}
