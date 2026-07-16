import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-step-confirmar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <div class="step__summary">
        <div class="step__card">
          <header><span>Sucursal</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(0)" />
          </header>
          <p>{{ form.get('branchId')?.value ?? '—' }}</p>
        </div>

        <div class="step__card">
          <header><span>Horario y capacidad</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(1)" />
          </header>
          <p>{{ form.get('startTime')?.value }}–{{ form.get('endTime')?.value }} · {{ form.get('slotDurationMinutes')?.value }} min · {{ form.get('patientsPerSlot')?.value }} pacientes/slot</p>
        </div>

        <div class="step__card">
          <header><span>Vigencia</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(2)" />
          </header>
          <p>{{ vigenciaSummary() }}</p>
        </div>
      </div>

      <div class="step__banner">
        Si los horarios se solapan con otra agenda activa, el backend rechazará el cambio y volverás al paso de vigencia.
      </div>
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: 1rem; }
            .step__summary { display: flex; flex-direction: column; gap: .75rem; }
            .step__card { border: 1px solid var(--p-content-border-color); border-radius: 6px; padding: 1rem; }
            .step__card > header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .25rem; color: var(--p-text-muted-color); font-size: .85rem; }
            .step__banner { padding: .75rem; background: var(--p-blue-50); border-radius: 6px; font-size: .9rem; }`],
})
export class StepConfirmarComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() isEdit = false;
  @Output() editStep = new EventEmitter<number>();

  protected vigenciaSummary(): string {
    const days = (this.form.get('recurringDaysOfWeek')?.value as string[]) ?? [];
    const recurring = this.form.get('isRecurring')?.value;
    const from = this.form.get('validFromDate')?.value;
    const to = this.form.get('validToDate')?.value;
    const range = to ? `${from} → ${to}` : `desde ${from}`;
    return recurring && days.length ? `${days.join('/')} · ${range}` : range;
  }
}
