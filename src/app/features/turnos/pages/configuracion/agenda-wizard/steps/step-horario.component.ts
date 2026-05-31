import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

export interface HorarioFormValue {
  fromTime: string;
  toTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
}

/** Cross-field: fromTime debe ser anterior a toTime. Exportado para test. */
export function timeRangeValid(control: AbstractControl): ValidationErrors | null {
  const from = control.get('fromTime')?.value as string | null;
  const to = control.get('toTime')?.value as string | null;
  if (!from || !to) return null;
  // String compare funciona para formato "HH:mm" porque es lexicográficamente ordenado.
  return from < to ? null : { timeRangeInvalid: true };
}

@Component({
  selector: 'app-step-horario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputNumberModule, InputTextModule],
  templateUrl: './step-horario.component.html',
  styleUrl: './step-horario.component.scss',
})
export class StepHorarioComponent implements OnInit {
  @Input() initial: HorarioFormValue | null = null;
  @Output() next = new EventEmitter<HorarioFormValue>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group(
    {
      fromTime: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      toTime: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
      patientsPerSlot: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    },
    { validators: [timeRangeValid] },
  );

  // Espejo signal del estado del form para que la pagina pueda habilitar
  // su boton "Continuar →" en el footer reactivamente via @ViewChild.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValid = (): boolean => this.status() === 'VALID';

  ngOnInit(): void {
    if (this.initial) {
      this.form.patchValue(this.initial);
    }
  }

  /**
   * Llamado por la pagina via @ViewChild cuando el usuario hace click en
   * "Continuar →" del footer. Valida y emite (next) con los datos del horario.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.next.emit(this.form.getRawValue());
  }
}
