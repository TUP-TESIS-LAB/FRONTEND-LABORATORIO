import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TipoAnalisis } from '../models/sacar-turno.model';

/**
 * Paso "análisis" (OPCIONAL): grilla de recomendados + buscador para filtrar el
 * catálogo. El análisis definitivo se confirma en la atención, por eso el paso
 * puede continuar sin selección.
 */
@Component({
  selector: 'sacar-step-tipos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule, SkeletonModule],
  template: `
    <div class="flex items-baseline gap-2 mb-1">
      <h2 class="text-lg font-semibold">¿Qué se va a realizar?</h2>
      <span class="text-sm text-surface-400">opcional</span>
    </div>
    <p class="text-sm text-surface-500 mb-4">
      Elegí entre los recomendados o buscá un análisis. El definitivo se confirma en la atención.
    </p>

    <input pInputText class="w-full sm:w-96 mb-4" placeholder="Buscar análisis…"
           [ngModel]="query()" (ngModelChange)="query.set($event)" />

    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (i of [1,2,3,4,5,6]; track i) { <p-skeleton height="92px" /> }
      </div>
    } @else if (filtered().length === 0) {
      <p class="text-surface-500">
        @if (query()) { No hay análisis que coincidan con “{{ query() }}”. }
        @else { No hay análisis configurados para este laboratorio. }
      </p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (t of filtered(); track t.id) {
          <button
            type="button"
            class="text-left rounded-xl border p-4 transition flex flex-col gap-1"
            [class.border-primary]="isSelected(t.id)"
            [class.bg-primary-50]="isSelected(t.id)"
            [class.border-surface-200]="!isSelected(t.id)"
            [attr.aria-pressed]="isSelected(t.id)"
            (click)="toggle(t.id)">
            <span class="font-medium">{{ t.nombre }}</span>
            @if (t.descripcionCorta) {
              <small class="text-surface-500">{{ t.descripcionCorta }}</small>
            }
            @if (t.ayuno) {
              <span class="text-xs text-amber-600 mt-1">Requiere ayuno</span>
            }
          </button>
        }
      </div>
    }

    @if (selectedIds().length) {
      <p class="text-sm text-surface-500 mt-4">
        {{ selectedIds().length }} análisis seleccionado{{ selectedIds().length === 1 ? '' : 's' }}.
      </p>
    }
  `,
})
export class StepTiposComponent {
  readonly tipos = input.required<TipoAnalisis[]>();
  readonly selectedIds = input.required<number[]>();
  readonly loading = input(false);
  readonly selectionChange = output<number[]>();

  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.tipos();
    return this.tipos().filter(t =>
      `${t.nombre} ${t.descripcionCorta} ${t.categoria}`.toLowerCase().includes(q));
  });

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggle(id: number): void {
    const next = this.isSelected(id)
      ? this.selectedIds().filter(x => x !== id)
      : [...this.selectedIds(), id];
    this.selectionChange.emit(next);
  }
}
