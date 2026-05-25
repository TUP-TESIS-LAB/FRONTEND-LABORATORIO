import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Analysis } from '../../models/atencion.model';
import { AnalysisService } from '../../services/analysis.service';

@Component({
  selector: 'lab-analysis-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule, ButtonModule, TableModule],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex gap-2 items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium mb-1">Código o nombre del análisis</label>
          <p-autocomplete
            [(ngModel)]="autoModel"
            [suggestions]="suggestions()"
            (completeMethod)="onAutoCompleteSearch($event)"
            (onSelect)="onAutoCompleteSelect($event)"
            (onKeyUp)="onKeyup($event)"
            [delay]="250"
            [forceSelection]="false"
            placeholder="Tipeá un código o nombre, Enter para agregar"
            optionLabel="name"
            styleClass="w-full">
            <ng-template let-item pTemplate="item">
              <div class="text-sm">
                <span class="font-mono">{{ item.shortCode }}</span> — {{ item.name }}
                @if (item.familyName) { <span class="text-xs opacity-60"> · {{ item.familyName }}</span> }
              </div>
            </ng-template>
          </p-autocomplete>
        </div>
      </div>

      @if (errorText()) {
        <div class="text-sm text-[var(--color-danger,#ef4444)]">{{ errorText() }}</div>
      }

      <p-table [value]="items()" [rows]="20" styleClass="text-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Práctica</th>
            <th>Familia</th>
            @if (showBasePrice()) { <th class="text-right">Precio base</th> }
            <th class="w-24"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono">{{ row.shortCode }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.familyName ?? '—' }}</td>
            @if (showBasePrice()) {
              <td class="text-right">{{ rowPrice(row) }}</td>
            }
            <td class="text-right">
              <p-button icon="pi pi-eye" severity="secondary" [text]="true" size="small"
                        (onClick)="detailRequested.emit(row.id)" />
              <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                        (onClick)="removeAnalysis(row.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="footer">
          @if (showBasePrice() && items().length) {
            <tr>
              <td colspan="3" class="text-right font-semibold">Total base</td>
              <td class="text-right font-semibold">{{ formatPrice(totalBase()) }} <span class="opacity-60">{{ hasUnpriced() ? '*' : '' }}</span></td>
              <td></td>
            </tr>
          }
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AnalysisPickerComponent implements OnInit {
  private readonly api = inject(AnalysisService);

  readonly initialItems = input<Analysis[]>([]);
  readonly ubValue      = input<number | null>(null);

  readonly analysisAdded   = output<Analysis>();
  readonly analysisRemoved = output<number>();
  readonly detailRequested = output<number>();

  protected autoModel: string | Analysis = '';
  readonly items       = signal<Analysis[]>([]);
  readonly suggestions = signal<Analysis[]>([]);
  readonly errorText   = signal<string | null>(null);

  readonly showBasePrice = computed(() => this.ubValue() != null);
  readonly totalBase     = computed(() => {
    const v = this.ubValue();
    if (v == null) return 0;
    return this.items().reduce((acc, x) => acc + (x.ubCount != null ? x.ubCount * v : 0), 0);
  });
  readonly hasUnpriced = computed(() => this.items().some((x) => x.ubCount == null));

  ngOnInit(): void {
    const initial = this.initialItems();
    if (initial?.length) this.items.set([...initial]);
  }

  onAutoCompleteSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim();
    if (!q) { this.suggestions.set([]); return; }
    // Si el usuario tipea solo dígitos → autocomplete por prefijo de shortCode.
    // Si tipea letras → autocomplete por nombre / familia.
    const obs = /^\d+$/.test(q)
      ? this.api.searchByShortCodePrefix(q)
      : this.api.searchByName(q);
    obs.subscribe({
      next: (list) => this.suggestions.set(list ?? []),
      error: () => this.suggestions.set([]),
    });
  }

  onAutoCompleteSelect(e: AutoCompleteSelectEvent): void {
    const item = e.value as Analysis;
    this.addAnalysis(item);
    this.autoModel = '';
  }

  onKeyup(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    const raw = typeof this.autoModel === 'string' ? this.autoModel.trim() : '';
    if (raw) this.handleEnter(raw);
  }

  handleEnter(raw: string): void {
    if (/^\d+$/.test(raw)) {
      const code = Number(raw);
      this.api.findByShortCode(code).subscribe({
        next: (found) => {
          if (!found) {
            this.errorText.set(`No se encontró análisis con código ${code}`);
            return;
          }
          this.addAnalysis(found);
          this.autoModel = '';
        },
        error: () => this.errorText.set('Error al buscar el análisis'),
      });
    }
  }

  addAnalysis(a: Analysis): void {
    if (this.items().some((x) => x.shortCode === a.shortCode)) {
      this.errorText.set(`El código ${a.shortCode} ya está en la lista`);
      return;
    }
    this.errorText.set(null);
    this.items.update((arr) => [...arr, a]);
    this.analysisAdded.emit(a);
  }

  removeAnalysis(id: number): void {
    this.items.update((arr) => arr.filter((x) => x.id !== id));
    this.analysisRemoved.emit(id);
  }

  clearAll(): void {
    this.items.set([]);
    this.errorText.set(null);
  }

  rowPrice(row: Analysis): string {
    const v = this.ubValue();
    if (v == null || row.ubCount == null) return '—';
    return this.formatPrice(row.ubCount * v);
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  }
}
