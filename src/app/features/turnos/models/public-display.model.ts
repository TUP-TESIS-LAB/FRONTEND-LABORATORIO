import { QueueStatus } from './queue-status.enum';

export interface PublicQueueEntry {
  id: number;
  publicCode: string;
  status: QueueStatus;
  lastCalledAt: string | null;
  callCount: number;
  createdAt: string;
  boxNumber?: number;
}

export interface OpenWindow {
  startTime: string;              // "HH:mm"
  endTime: string;                // "HH:mm"
}

export interface DisplaySnapshot {
  tenantName: string;
  branchName: string;
  serverTime: string;             // "HH:mm"
  openWindow: OpenWindow | null;  // null = no agendas activas hoy
  entries: PublicQueueEntry[];
}
