import { Gender } from '@features/pacientes/models/patient.model';

export interface SampleSummary {
  sampleType: string;
  count: number;
}

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
  samples: SampleSummary[];
}

export interface InExtractionItem extends AwaitingExtractionItem {
  attentionBox: number;
  extractionStartedAt: string;
  extractorId: number;
  extractorFullName: string;
}

export interface ExtractionStats {
  queueSize: number;
  averageWaitMinutes: number | null;
  finishedTodayByMe: number;
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

/** Asignación de extractor a un box de una sucursal. */
export interface BoxAssignment {
  boxNumber: number;
  extractorId: number | null;
  extractorFullName: string | null;
}

/** Extractor disponible en una sucursal. */
export interface BranchExtractor {
  id: number;
  fullName: string;
}
