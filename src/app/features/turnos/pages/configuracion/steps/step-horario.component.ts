import { ChangeDetectionStrategy, Component, Input, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Subject, takeUntil } from 'rxjs';
import { SLOT_DURATION_OPTIONS } from '../../../models/agenda-config.model';

@Component({
  selector: 'app-step-horario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, InputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <div class="step__row">
        <label>Inicio
          <input type="time" [formControl]="$any(form.get('startTime'))" />
        </label>
        <label>Fin
          <input type="time" [formControl]="$any(form.get('endTime'))" />
        </label>
      </div>

      <label>Duración del slot
        <p-select [options]="slotOptions" optionLabel="label" optionValue="value"
                  [formControl]="$any(form.get('slotDurationMinutes'))" />
      </label>

      <label>Pacientes por slot
        <p-inputNumber [min]="1" [formControl]="$any(form.get('patientsPerSlot'))" />
      </label>

      <div class="step__preview">
        <strong>{{ previewCapacity() }}</strong> pacientes/día estimados.
      </div>

      @if (timeError()) {
        <small class="step__error">{{ timeError() }}</small>
      }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .75rem; }
            .step__row { display: flex; gap: 1rem; }
            .step__preview { padding: .75rem; background: var(--p-primary-50); border-radius: 6px; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepHorarioComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;

  protected slotOptions = SLOT_DURATION_OPTIONS.map(v => ({ label: `${v} min`, value: v }));

  protected formValue = signal<any>({});
  private destroy$ = new Subject<void>();

  protected previewCapacity = computed(() => {
    const v = this.formValue();
    const start = this.parseMinutes(v.startTime);
    const end = this.parseMinutes(v.endTime);
    const slot = v.slotDurationMinutes ?? 0;
    const cap = v.patientsPerSlot ?? 0;
    if (start == null || end == null || slot <= 0 || cap <= 0 || end <= start) return 0;
    return Math.floor((end - start) / slot) * cap;
  });

  protected timeError = computed(() => {
    const v = this.formValue();
    const start = this.parseMinutes(v.startTime);
    const end = this.parseMinutes(v.endTime);
    if (start == null || end == null) return '';
    if (end <= start) return 'La hora de fin debe ser posterior a la de inicio.';
    return '';
  });

  ngOnInit(): void {
    this.formValue.set(this.form.value);
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => this.formValue.set(v));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseMinutes(hhmm: string | null | undefined): number | null {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
}
