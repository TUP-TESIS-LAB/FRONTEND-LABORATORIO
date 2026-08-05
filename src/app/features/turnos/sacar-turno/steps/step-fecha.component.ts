import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { SlotDisponible } from '../models/sacar-turno.model';

/** Paso 4: calendario inline + grilla de horarios disponibles. */
@Component({
  selector: 'sacar-step-fecha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePickerModule, SkeletonModule],
  template: `
    <div class="flex items-baseline gap-2 mb-2">
      <label class="text-sm font-medium text-surface-600">Fecha y horario</label>
      <span class="text-xs text-surface-400">desde hoy en adelante</span>
    </div>

    <div class="flex flex-col lg:flex-row gap-6">
      <p-datepicker
        [inline]="true"
        [ngModel]="fecha()"
        [minDate]="minDate()"
        [showWeek]="false"
        (ngModelChange)="fechaChange.emit($event)" />

      <div class="flex-1">
        @if (!fecha()) {
          <p class="text-surface-500">Elegí una fecha para ver los horarios disponibles.</p>
        } @else if (loading()) {
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            @for (i of [1,2,3,4,5,6,7,8]; track i) { <p-skeleton height="40px" /> }
          </div>
        } @else if (slots().length === 0) {
          <p class="text-surface-500">No hay horarios disponibles para esta fecha.</p>
        } @else {
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            @for (s of slots(); track s.hora) {
              <button
                type="button"
                class="rounded-lg border px-2 py-2 text-sm font-medium transition"
                [disabled]="!s.disponible"
                [class.border-primary]="s.hora === selectedHora()"
                [class.bg-primary]="s.hora === selectedHora()"
                [class.text-white]="s.hora === selectedHora()"
                [class.border-surface-200]="s.hora !== selectedHora()"
                [class.opacity-40]="!s.disponible"
                [class.cursor-not-allowed]="!s.disponible"
                (click)="horaChange.emit(s.hora)">
                {{ s.hora }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class StepFechaComponent {
  readonly fecha = input<Date | null>(null);
  readonly selectedHora = input<string | null>(null);
  readonly slots = input.required<SlotDisponible[]>();
  readonly loading = input(false);
  readonly minDate = input.required<Date>();

  readonly fechaChange = output<Date>();
  readonly horaChange = output<string>();
}
