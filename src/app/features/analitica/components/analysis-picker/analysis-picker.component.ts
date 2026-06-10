import {
  ChangeDetectionStrategy, Component, effect, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { Analysis } from '../../models/atencion.model';
import { AnalysisService } from '../../services/analysis.service';

/** Fila interna del picker: análisis de catálogo + estado de autorización. */
export interface PickerRow extends Analysis {
  isAuthorized: boolean;
}

@Component({
  selector: 'lab-analysis-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule, ButtonModule, CheckboxModule, TableModule],
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
        <!-- Slot a la derecha del buscador (p. ej. el toggle "Urgente"). La tabla queda
             debajo, a todo el ancho. -->
        <ng-content />
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
            <th class="text-center w-28">Autorizado</th>
            <th class="w-24"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono">{{ row.shortCode }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.familyName ?? '—' }}</td>
            <td class="text-center">
              <p-checkbox [ngModel]="row.isAuthorized" [binary]="true"
                          (onChange)="onAuthorizedChange(row, $event.checked)" />
            </td>
            <td class="text-right">
              <p-button icon="pi pi-eye" severity="secondary" [text]="true" size="small"
                        (onClick)="detailRequested.emit(row.id)" />
              <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                        (onClick)="removeAnalysis(row.id)" />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AnalysisPickerComponent {
  private readonly api = inject(AnalysisService);

  /**
   * Items con los que arranca el picker al retomar/rehidratar una atención.
   * Acepta filas que ya traen `isAuthorized` (p. ej. las autorizaciones guardadas en
   * el backend) y las respeta; si no lo traen, default `false`.
   */
  readonly initialItems = input<ReadonlyArray<Analysis & { isAuthorized?: boolean }>>([]);

  readonly analysisAdded   = output<PickerRow>();
  readonly analysisRemoved = output<number>();
  readonly detailRequested = output<number>();
  /** Emite la lista actualizada cada vez que cambia un checkbox de autorización. */
  readonly itemsChanged    = output<PickerRow[]>();

  protected autoModel: string | Analysis = '';
  readonly items       = signal<PickerRow[]>([]);
  readonly suggestions = signal<Analysis[]>([]);
  readonly errorText   = signal<string | null>(null);

  /** Una sola hidratación: cuando `initialItems` llega no-vacío (carga async al retomar). */
  private hydrated = false;

  constructor() {
    effect(() => {
      const initial = this.initialItems();
      if (this.hydrated || !initial?.length) return;
      this.hydrated = true;
      this.items.set(initial.map((a) => ({ ...a, isAuthorized: a.isAuthorized ?? false })));
      // Notificamos al padre para que su lista de dispatch quede sembrada con lo
      // ya cargado (mismo contrato que onAuthorizedChange). Así, si el usuario
      // confirma sin tocar nada, se re-envían los análisis existentes.
      this.itemsChanged.emit(this.items());
    });
  }

  onAutoCompleteSearch(e: AutoCompleteCompleteEvent): void {
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
      this.api.findByShortCode(raw).subscribe({
        next: (found) => {
          if (!found) {
            this.errorText.set(`No se encontró análisis con código ${raw}`);
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
    const row: PickerRow = { ...a, isAuthorized: false };
    this.items.update((arr) => [...arr, row]);
    this.analysisAdded.emit(row);
  }

  removeAnalysis(id: number): void {
    this.items.update((arr) => arr.filter((x) => x.id !== id));
    this.analysisRemoved.emit(id);
  }

  clearAll(): void {
    this.items.set([]);
    this.errorText.set(null);
  }

  /** Actualiza isAuthorized de forma inmutable y notifica al padre. */
  onAuthorizedChange(row: PickerRow, value: boolean): void {
    this.items.update((arr) => arr.map((r) => r.id === row.id ? { ...r, isAuthorized: value } : r));
    this.itemsChanged.emit(this.items());
  }
}
