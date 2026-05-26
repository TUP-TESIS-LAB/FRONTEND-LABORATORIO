import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

export interface HorarioFormValue {
  fromTime: string;
  toTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
}

@Component({
  selector: 'app-step-horario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule],
  templateUrl: './step-horario.component.html',
  styleUrl: './step-horario.component.scss',
})
export class StepHorarioComponent implements OnInit {
  @Input() initial: HorarioFormValue | null = null;
  @Output() next = new EventEmitter<HorarioFormValue>();
  @Output() back = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    toTime: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
    patientsPerSlot: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  ngOnInit(): void {
    if (this.initial) {
      this.form.patchValue(this.initial);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.next.emit(this.form.getRawValue());
  }
}
