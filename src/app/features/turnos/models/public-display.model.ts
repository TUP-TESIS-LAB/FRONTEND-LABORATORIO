import { QueueStatus } from './queue-status.enum';

export interface PublicQueueEntry {
  id: number;
  publicCode: string;
  status: QueueStatus;
  lastCalledAt: string | null;
  callCount: number;
  createdAt: string;
  /**
   * Box de extracción asignado al paciente.
   * Por ahora mockeado en frontend (`TvExtraccionMockService`).
   * Backend agregará el campo cuando exista el modelo `Branch.boxes`.
   */
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
