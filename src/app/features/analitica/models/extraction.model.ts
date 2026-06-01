import { Gender } from '@features/pacientes/models/patient.model';

export interface AwaitingExtractionItem {
  id: number;
  patientId: number;
  patientFullName: string;
  patientDni: string;
  patientBirthDate: string | null;
  patientGender: Gender | null;
  attentionNumber: string;
  isUrgent: boolean;
  analysisCount: number;
  insurancePlanLabel: string | null;
  createdAt: string;
  waitMinutes: number;
}

export interface InExtractionItem extends AwaitingExtractionItem {
  attentionBox: number;
  extractionStartedAt: string;
  extractorId: number;
}

export interface ExtractionStats {
  queueSize: number;
  averageWaitMinutes: number | null;
  finishedTodayByMe: number;
}

export interface AssignExtractorRequest {
  attentionBox: number;
  branchId: number;
}

export interface CancelExtractionRequest {
  reason: string;
}

/** Sucursal en la que un extractor puede trabajar. */
export interface BranchOption {
  id: number;
  code: string;
  name: string;
}

/** Una fila por box ocupado en la sucursal actual. */
export interface BoxOccupancyItem {
  box: number;
  extractorId: number;
  extractorFullName: string;
  attentionId: number;
  attentionNumber: string;
}
