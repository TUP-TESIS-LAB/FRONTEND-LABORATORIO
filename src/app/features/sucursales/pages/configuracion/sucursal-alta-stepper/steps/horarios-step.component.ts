import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { selectSchedules } from '../../../../store/sucursal.selectors';
import { loadSchedules, addSchedule, deleteSchedule } from '../../../../store/sucursal.actions';
import { BranchSchedule, DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';

const DAY_OPTIONS: { label: string; value: DayOfWeek }[] = [
  { label: 'Lunes', value: 'MONDAY' },
  { label: 'Martes', value: 'TUESDAY' },
  { label: 'Miércoles', value: 'WEDNESDAY' },
  { label: 'Jueves', value: 'THURSDAY' },
  { label: 'Viernes', value: 'FRIDAY' },
  { label: 'Sábado', value: 'SATURDAY' },
  { label: 'Domingo', value: 'SUNDAY' },
];

const SCHEDULE_TYPE_OPTIONS: { label: string; value: ScheduleType }[] = [
  { label: 'Día completo', value: 'FULL_DAY' },
  { label: 'Mañana', value: 'MORNING' },
  { label: 'Tarde', value: 'AFTERNOON' },
  { label: 'Noche', value: 'NIGHT' },
];

@Component({
  selector: 'app-horarios-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, SelectModule, InputTextModule],
  templateUrl: './horarios-step.component.html',
  styleUrl: './horarios-step.component.scss',
})
export class HorariosStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);
  private fb = inject(FormBuilder);

  protected readonly schedules = this.store.selectSignal(selectSchedules);
  protected readonly dayOptions = DAY_OPTIONS;
  protected readonly typeOptions = SCHEDULE_TYPE_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    dayFrom: ['MONDAY' as DayOfWeek, Validators.required],
    dayTo: ['FRIDAY' as DayOfWeek, Validators.required],
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    toTime: ['17:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    scheduleType: ['FULL_DAY' as ScheduleType, Validators.required],
  });

  ngOnInit() {
    this.store.dispatch(loadSchedules({ branchId: this.branchId }));
  }

  add() {
    if (this.form.invalid) return;
    const input = this.form.getRawValue();
    this.store.dispatch(addSchedule({ branchId: this.branchId, input }));
    this.form.reset({
      dayFrom: 'MONDAY', dayTo: 'FRIDAY',
      fromTime: '09:00', toTime: '17:00',
      scheduleType: 'FULL_DAY',
    });
  }

  remove(id: number) {
    this.store.dispatch(deleteSchedule({ branchId: this.branchId, id }));
  }

  labelForDay(day: DayOfWeek): string {
    return DAY_OPTIONS.find(o => o.value === day)?.label ?? day;
  }

  labelForType(type: ScheduleType): string {
    return SCHEDULE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }
}
