export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type ScheduleType = 'FULL_DAY' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface BranchSchedule {
  id: number;
  branchId: number;
  dayFrom: DayOfWeek;
  dayTo: DayOfWeek;
  fromTime: string; // 'HH:mm'
  toTime: string;   // 'HH:mm'
  scheduleType: ScheduleType;
  active: boolean;
}

export interface BranchScheduleCreateInput {
  dayFrom: DayOfWeek;
  dayTo: DayOfWeek;
  fromTime: string;
  toTime: string;
  scheduleType: ScheduleType;
}
