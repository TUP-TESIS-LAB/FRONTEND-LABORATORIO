import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TipoAnalisis } from '../models/sacar-turno.model';

/** Paso 2: grilla de selección múltiple de tipos de análisis. */
@Component({
  selector: 'sacar-step-tipos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonModule],
  template: `
    <h2 class="text-lg font-semibold mb-1">¿Qué se va a realizar?</h2>
    <p class="text-sm text-surface-500 mb-4">Elegí uno o más análisis para el turno.</p>

    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (i of [1,2,3,4,5,6]; track i) { <p-skeleton height="96px" /> }
      </div>
    } @else if (tipos().length === 0) {
      <p class="text-surface-500">No hay tipos de análisis configurados para este laboratorio.</p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (t of tipos(); track t.id) {
          <button
            type="button"
            class="text-left rounded-xl border p-4 transition flex flex-col gap-1"
            [class.border-primary]="isSelected(t.id)"
            [class.bg-primary-50]="isSelected(t.id)"
            [class.border-surface-200]="!isSelected(t.id)"
            [attr.aria-pressed]="isSelected(t.id)"
            (click)="toggle(t.id)">
            <div class="flex items-center gap-2">
              <i class="pi {{ t.icono || 'pi-flask' }} text-primary"></i>
              <span class="font-medium">{{ t.nombre }}</span>
              @if (isSelected(t.id)) { <i class="pi pi-check-circle text-primary ml-auto"></i> }
            </div>
            @if (t.descripcionCorta) {
              <small class="text-surface-500">{{ t.descripcionCorta }}</small>
            }
            @if (t.ayuno) {
              <span class="text-xs text-amber-600 mt-1"><i class="pi pi-clock"></i> Requiere ayuno</span>
            }
          </button>
        }
      </div>
    }
  `,
})
export class StepTiposComponent {
  readonly tipos = input.required<TipoAnalisis[]>();
  readonly selectedIds = input.required<number[]>();
  readonly loading = input(false);
  readonly selectionChange = output<number[]>();

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
