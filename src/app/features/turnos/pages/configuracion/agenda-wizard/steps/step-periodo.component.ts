import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  effect,
  inject,
  Input,
  OnInit,
  Output,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePickerModule } from 'primeng/datepicker';

export interface PeriodoFormValue {
  daysOfWeek: number[]; // ISO 1-7
  validFrom: Date;
  validTo: Date;
}

function minOneDay(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number[] | null;
  return value && value.length > 0 ? null : { required: true };
}

/** Cross-field: validFrom debe ser anterior a validTo. Exportado para test. */
export function dateRangeValid(control: AbstractControl): ValidationErrors | null {
  const from = control.get('validFrom')?.value as Date | null;
  const to = control.get('validTo')?.value as Date | null;
  if (!from || !to) return null;
  const fromTime = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const toTime = to instanceof Date ? to.getTime() : new Date(to).getTime();
  return fromTime < toTime ? null : { dateRangeInvalid: true };
}

@Component({
  selector: 'app-step-periodo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePickerModule],
  templateUrl: './step-periodo.component.html',
  styleUrl: './step-periodo.component.scss',
})
export class StepPeriodoComponent implements OnInit {
  @Input() initial: PeriodoFormValue | null = null;
  @Output() next = new EventEmitter<PeriodoFormValue>();

  /**
   * Emite el estado de validez del form en cada cambio. La pagina lo consume
   * para habilitar reactivamente el boton "Continuar →" del footer.
   */
  readonly validChange = output<boolean>();

  protected readonly DAYS = [
    { id: 1, label: 'L' },
    { id: 2, label: 'M' },
    { id: 3, label: 'X' },
    { id: 4, label: 'J' },
    { id: 5, label: 'V' },
    { id: 6, label: 'S' },
    { id: 7, label: 'D' },
  ];

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group(
    {
      daysOfWeek: [[1, 2, 3, 4, 5] as number[], [Validators.required, minOneDay]],
      validFrom: [new Date(), Validators.required],
      validTo: [new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), Validators.required],
    },
    { validators: [dateRangeValid] },
  );

  // Espejo signal del estado del form para que la pagina pueda habilitar
  // su boton "Continuar →" en el footer reactivamente.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValid = (): boolean => this.status() === 'VALID';

  constructor() {
    effect(() => {
      this.validChange.emit(this.formValid());
    });
  }

  ngOnInit(): void {
    if (this.initial) {
      this.form.patchValue(this.initial);
    }
  }

  toggleDay(dayId: number): void {
    const current: number[] = this.form.value.daysOfWeek ?? [];
    const updated = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId].sort((a, b) => a - b);
    this.form.patchValue({ daysOfWeek: updated });
    this.form.controls.daysOfWeek.markAsTouched();
  }

  isSelected(dayId: number): boolean {
    return (this.form.value.daysOfWeek ?? []).includes(dayId);
  }

  /**
   * Llamado por la pagina via @ViewChild cuando el usuario hace click en
   * "Continuar →" del footer. Valida y emite (next) con los datos del periodo.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.next.emit(this.form.getRawValue() as PeriodoFormValue);
  }
}
