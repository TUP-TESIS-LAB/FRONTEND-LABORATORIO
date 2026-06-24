import type { SampleState } from './sample.model';

/** Estados de la FSM real del backend (LabelStatus). */
export type BackendLabelStatus =
  | 'PENDING' | 'COLLECTED' | 'IN_TRANSIT' | 'PROCESSING' | 'COMPLETED'
  | 'DERIVED' | 'CANCELED' | 'REJECTED' | 'LOST' | 'DISCARDED';

/** Item del GET /labels/worklist (LabelWorklistItemResponse del back). */
export interface LabelWorklistItem {
  labelId: number;
  sampleId: number | null;
  barcode: string;
  protocolId: number;
  analysisTypeId: number;
  analysisName: string;
  patientName: string;
  urgent: boolean;
  status: BackendLabelStatus;
  updatedAt: string;
  rejectionReason?: string | null;
  /** Estado de carga de las determinaciones. Solo llega para status PROCESSING. */
  cargaStatus?: 'PARCIAL' | 'COMPLETA';
}

/** PENDING y CANCELED no tienen pantalla en las worklists. */
export const BACKEND_TO_SAMPLE_STATE: Partial<Record<BackendLabelStatus, SampleState>> = {
  COLLECTED: 'collected',
  IN_TRANSIT: 'transito',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  DERIVED: 'derived',
  REJECTED: 'rejected',
  LOST: 'lost',
  DISCARDED: 'discarded',
};

