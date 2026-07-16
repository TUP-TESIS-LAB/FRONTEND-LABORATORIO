import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TipoAnalisis } from '../models/sacar-turno.model';

const MAX_SUGERENCIAS = 8;

/**
 * Paso "análisis" (OPCIONAL): buscador + tabla de seleccionados, mismo patrón
 * visual que lab-analysis-picker (Atención). El catálogo (TipoAnalisis) ya
 * está cargado en memoria, así que el filtro es client-side, sin llamadas HTTP.
 */
@Component({
  selector: 'sacar-step-tipos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule, ButtonModule, SkeletonModule, TableModule],
  template: `
    <div class="flex items-baseline gap-2 mb-1">
      <h2 class="text-lg font-semibold">¿Qué se va a realizar?</h2>
      <span class="text-sm text-surface-400">opcional</span>
    </div>
    <p class="text-sm text-surface-500 mb-4">
      Buscá un análisis para agregarlo. El definitivo se confirma en la atención.
    </p>

    @if (loading()) {
      <div class="flex flex-col gap-2">
        <p-skeleton height="40px" styleClass="w-full sm:w-96" />
        <p-skeleton height="120px" />
      </div>
    } @else if (tipos().length === 0) {
      <p class="text-surface-500">No hay análisis configurados para este laboratorio.</p>
    } @else {
      <div class="mb-4">
        <p-autocomplete
          [(ngModel)]="query"
          [suggestions]="suggestions()"
          (completeMethod)="onSearch($event)"
          (onSelect)="onSelect($event)"
          (onKeyUp)="onKeyup($event)"
          [delay]="200"
          [forceSelection]="false"
          placeholder="Buscar análisis por nombre…"
          optionLabel="nombre"
          styleClass="w-full sm:w-96">
          <ng-template let-item pTemplate="item">
            <div class="text-sm">
              {{ item.nombre }}
              <span class="text-xs opacity-60"> · {{ item.categoria }}</span>
              @if (item.ayuno) { <span class="text-xs text-amber-600"> · Requiere ayuno</span> }
            </div>
          </ng-template>
        </p-autocomplete>
      </div>

      <p-table [value]="selectedTipos()" styleClass="text-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Análisis</th>
            <th>Categoría</th>
            <th class="w-28 text-center">Ayuno</th>
            <th class="w-16"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              {{ row.nombre }}
              @if (row.descripcionCorta) {
                <small class="block text-surface-500">{{ row.descripcionCorta }}</small>
              }
            </td>
            <td>{{ row.categoria }}</td>
            <td class="text-center">
              @if (row.ayuno) { <span class="text-amber-600 text-xs">Sí</span> }
            </td>
            <td class="text-right">
              <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                        (onClick)="remove(row.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="4" class="text-surface-500 text-center py-4">
              Ningún análisis seleccionado todavía.
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
})
export class StepTiposComponent {
  readonly tipos = input.required<TipoAnalisis[]>();
  readonly selectedIds = input.required<number[]>();
  readonly loading = input(false);
  readonly selectionChange = output<number[]>();

  protected query = '';
  protected readonly suggestions = signal<TipoAnalisis[]>([]);

  protected readonly selectedTipos = computed(() =>
    this.tipos().filter(t => this.selectedIds().includes(t.id)));

  onSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim().toLowerCase();
    const pool = this.tipos().filter(t => !this.selectedIds().includes(t.id));
    const matches = q
      ? pool.filter(t => `${t.nombre} ${t.descripcionCorta} ${t.categoria}`.toLowerCase().includes(q))
      : pool;
    this.suggestions.set(matches.slice(0, MAX_SUGERENCIAS));
  }

  onSelect(e: AutoCompleteSelectEvent): void {
    this.add(e.value as TipoAnalisis);
  }

  onKeyup(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    const sugg = this.suggestions();
    if (sugg.length === 1) this.add(sugg[0]);
  }

  remove(id: number): void {
    this.selectionChange.emit(this.selectedIds().filter(x => x !== id));
  }

  private add(t: TipoAnalisis): void {
    if (this.selectedIds().includes(t.id)) return;
    this.selectionChange.emit([...this.selectedIds(), t.id]);
    this.query = '';
    this.suggestions.set([]);
  }
}
