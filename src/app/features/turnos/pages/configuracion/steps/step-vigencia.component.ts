import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { WEEK_DAYS } from '../../../models/agenda-config.model';

@Component({
  selector: 'app-step-vigencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectButtonModule, ToggleSwitchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <label class="step__inline">
        <p-toggleSwitch [formControl]="$any(form.get('isRecurring'))" />
        Recurrente (se repite todos los días seleccionados)
      </label>

      @if (form.get('isRecurring')?.value) {
        <label>Días de la semana
          <p-selectButton
            [options]="dayOptions"
            optionLabel="label"
            optionValue="value"
            [multiple]="true"
            [formControl]="$any(form.get('recurringDaysOfWeek'))"
          />
        </label>
        @if ((form.get('recurringDaysOfWeek')?.value?.length ?? 0) === 0) {
          <small class="step__error">Seleccioná al menos un día.</small>
        }
      }

      <label>Vigente desde
        <input type="date" [formControl]="$any(form.get('validFromDate'))" />
      </label>

      <label>Vigente hasta (opcional)
        <input type="date" [formControl]="$any(form.get('validToDate'))" />
      </label>

      @if (rangeError()) { <small class="step__error">{{ rangeError() }}</small> }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .75rem; }
            .step__inline { display: flex; align-items: center; gap: .5rem; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepVigenciaComponent {
  @Input({ required: true }) form!: FormGroup;

  protected dayOptions = WEEK_DAYS.map(d => ({
    label: ({ MONDAY:'L', TUESDAY:'M', WEDNESDAY:'X', THURSDAY:'J', FRIDAY:'V', SATURDAY:'S', SUNDAY:'D' } as Record<string, string>)[d],
    value: d,
  }));

  protected rangeError(): string {
    const from = this.form.get('validFromDate')?.value;
    const to = this.form.get('validToDate')?.value;
    if (from && to && to < from) return 'La fecha hasta no puede ser anterior a la de desde.';
    return '';
  }
}
