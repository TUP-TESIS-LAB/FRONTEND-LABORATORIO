// Alineado 1:1 con backend AgendaConfigResponse / AgendaConfigRequest / UpdateAgendaConfigRequest
export interface AgendaConfig {
  id: number;
  branchId: number;
  tenantId: number;
  startTime: string;            // "HH:mm" o "HH:mm:ss"
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  appointmentsCount: number;
  isRecurring: boolean;
  validFromDate: string;        // ISO date "YYYY-MM-DD"
  validToDate: string | null;
  recurringDaysOfWeek: string | null; // "MONDAY,TUESDAY,..."
}

export interface CreateAgendaConfigRequest {
  branchId: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  isRecurring: boolean;
  validFromDate: string;
  validToDate?: string;
  recurringDaysOfWeek?: string;
}

export type UpdateAgendaConfigRequest = Omit<CreateAgendaConfigRequest, 'branchId'>;

export const WEEK_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const;
export type WeekDay = typeof WEEK_DAYS[number];

export const SLOT_DURATION_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
