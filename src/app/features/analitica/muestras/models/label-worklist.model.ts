import type { Sample, SampleState } from './sample.model';

/** Estados de la FSM real del backend (LabelStatus). */
export type BackendLabelStatus =
  | 'PENDING' | 'COLLECTED' | 'IN_TRANSIT' | 'PROCESSING' | 'COMPLETED'
  | 'DERIVED' | 'CANCELED' | 'REJECTED' | 'LOST' | 'DISCARDED';

/** Item del GET /labels/worklist (LabelWorklistItemResponse del back). */
export interface LabelWorklistItem {
  labelId: number;
  barcode: string;
  protocolId: number;
  analysisName: string;
  patientName: string;
  urgent: boolean;
  status: BackendLabelStatus;
  updatedAt: string;
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

const two = (n: number): string => String(n).padStart(2, '0');

/** Adapta el item del backend al view-model Sample que consumen los componentes. */
export function toSample(item: LabelWorklistItem, branchName: string): Sample {
  const d = new Date(item.updatedAt);
  return {
    id: String(item.labelId),
    barcode: item.barcode,
    study: item.analysisName,
    patient: item.patientName,
    branch: branchName,
    date: `${two(d.getDate())}/${two(d.getMonth() + 1)}`,
    time: `${two(d.getHours())}:${two(d.getMinutes())}`,
    urgent: item.urgent,
    state: BACKEND_TO_SAMPLE_STATE[item.status] ?? 'collected',
  };
}
