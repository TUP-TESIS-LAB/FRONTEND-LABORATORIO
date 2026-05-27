import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal, computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { selectSchedules } from '../../../../store/sucursal.selectors';
import { loadSchedules, addSchedule, deleteSchedule } from '../../../../store/sucursal.actions';
import { DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';

const SCHEDULE_TYPE_OPTIONS: { label: string; value: ScheduleType }[] = [
  { label: 'Día completo', value: 'FULL_DAY' },
  { label: 'Mañana', value: 'MORNING' },
  { label: 'Tarde', value: 'AFTERNOON' },
  { label: 'Noche', value: 'NIGHT' },
];

export const DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'MONDAY',    label: 'L' },
  { id: 'TUESDAY',   label: 'M' },
  { id: 'WEDNESDAY', label: 'X' },
  { id: 'THURSDAY',  label: 'J' },
  { id: 'FRIDAY',    label: 'V' },
  { id: 'SATURDAY',  label: 'S' },
  { id: 'SUNDAY',    label: 'D' },
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

@Component({
  selector: 'app-horarios-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, SelectModule, InputTextModule, TooltipModule],
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
  protected readonly DAYS = DAYS;
  protected readonly typeOptions = SCHEDULE_TYPE_OPTIONS;

  /** Set of selected day IDs */
  protected readonly selectedDays = signal<Set<DayOfWeek>>(new Set());

  protected readonly canAdd = computed(
    () => this.selectedDays().size > 0 && this.form.valid
  );

  protected readonly form = this.fb.nonNullable.group({
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    toTime:   ['17:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    scheduleType: ['FULL_DAY' as ScheduleType, Validators.required],
  });

  ngOnInit() {
    this.store.dispatch(loadSchedules({ branchId: this.branchId }));
  }

  toggleDay(day: DayOfWeek): void {
    const next = new Set(this.selectedDays());
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    this.selectedDays.set(next);
  }

  add() {
    if (!this.canAdd()) return;
    const { fromTime, toTime, scheduleType } = this.form.getRawValue();
    for (const day of this.selectedDays()) {
      this.store.dispatch(addSchedule({
        branchId: this.branchId,
        input: { dayFrom: day, dayTo: day, fromTime, toTime, scheduleType },
      }));
    }
    this.selectedDays.set(new Set());
    this.form.reset({ fromTime: '09:00', toTime: '17:00', scheduleType: 'FULL_DAY' });
  }

  remove(id: number) {
    this.store.dispatch(deleteSchedule({ branchId: this.branchId, id }));
  }

  labelForDay(day: DayOfWeek): string {
    return DAY_LABELS[day] ?? day;
  }

  labelForType(type: ScheduleType): string {
    return SCHEDULE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }
}
