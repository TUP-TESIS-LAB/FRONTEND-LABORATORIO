import { QueueStatus } from './queue-status.enum';

export interface QueueEntry {
  id: number;
  publicCode: string;             // "CT-0023" | "ST-0007"
  nationalId: string;
  patientId: number | null;
  branchId: number;
  appointmentId: number | null;   // null para walk-ins (ST), no-null para CT
  hasAppointment: boolean;
  status: QueueStatus;
  lastCalledAt: string | null;    // ISO timestamp
  callCount: number;
  createdAt: string;
}

export interface CallQueueEntryResponse {
  id: number;
  lastCalledAt: string;
  callCount: number;
  status: QueueStatus;
}
