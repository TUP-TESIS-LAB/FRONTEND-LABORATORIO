import { AttentionState } from './atencion.model';

export interface UrgentInProgressItem {
  attentionId: number;
  attentionNumber: string;
  patientFullName: string | null;
  patientDni: string | null;
  attentionState: AttentionState;
  urgentSince: string; // ISO
}

export interface UrgentInProgressBoard {
  slaTargetMinutes: number;
  items: UrgentInProgressItem[];
}
