import { Gender } from '@features/pacientes/models/patient.model';

export interface SampleSummary {
  /** Valor crudo del enum `SampleType` del backend (BLOOD, URINE, …). Traducir con `SampleTypeLabelPipe`. */
  sampleType: string;
  /**
   * Cantidad de análisis autorizados+activos que requieren este tipo de muestra.
   *
   * OJO: NO es una cantidad de muestras ni de tubos — sumarlo da ≈ `analysisCount`.
   * Para mostrarle al extractor cuántos recipientes pinchar, usar `tubeCount`.
   */
  count: number;
  /**
   * Cantidad de tubos/recipientes físicos a extraer para este tipo de muestra. Sale de la
   * config del laboratorio por (tenant, tipo de muestra) — varios análisis comparten un tubo.
   * Default 1 por tipo presente cuando el laboratorio no configuró nada.
   */
  tubeCount: number;
}

export interface AwaitingExtractionItem {
  id: number;
  patientId: number;
  patientFullName: string;
  patientDni: string;
  patientBirthDate: string | null;
  patientGender: Gender | null;
  attentionNumber: string;
  publicCode: string | null;
  isUrgent: boolean;
  analysisCount: number;
  insurancePlanLabel: string | null;
  createdAt: string;
  waitMinutes: number;
  /**
   * Muestras a extraer, agrupadas por tipo. Ambas colas (`/awaiting-extraction` e
   * `/in-extraction`) la envían siempre; el backend serializa `[]` cuando no hay muestras,
   * nunca `null`. Por eso no es opcional.
   */
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
