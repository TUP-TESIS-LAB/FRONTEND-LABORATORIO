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
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
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

@Component({
  selector: 'app-step-periodo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule],
  templateUrl: './step-periodo.component.html',
  styleUrl: './step-periodo.component.scss',
})
export class StepPeriodoComponent implements OnInit {
  @Input() initial: PeriodoFormValue | null = null;
  @Output() next = new EventEmitter<PeriodoFormValue>();
  @Output() back = new EventEmitter<void>();

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

  protected readonly form = this.fb.nonNullable.group({
    daysOfWeek: [[1, 2, 3, 4, 5] as number[], [Validators.required, minOneDay]],
    validFrom: [new Date(), Validators.required],
    validTo: [new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), Validators.required],
  });

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

  submit(): void {
    if (this.form.invalid) return;
    this.next.emit(this.form.getRawValue() as PeriodoFormValue);
  }
}
