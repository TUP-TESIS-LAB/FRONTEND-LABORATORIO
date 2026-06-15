export type ValidationOutcome = 'PASS' | 'WARNING' | 'FAIL';
export type ResultStatus = 'PENDING' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'SIGNED';
export type StudyStatus = 'PENDING' | 'PARTIALLY_SIGNED' | 'READY_FOR_SIGNATURE' | 'CLOSED';

export interface Study {
  id: number; protocolId: number; patientId: number;
  currentStatus: StudyStatus; expectedResultsCount: number; signedResultsCount: number;
}
export interface PostResult { id: number; studyId: number; analyticResultId: number; status: ResultStatus; sectionId: number; }
export interface DetValidation {
  id: number; resultId: number; determinationId: number;
  aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null;
}
export interface ResultWithValidation { result: PostResult; validations: { validation: DetValidation }[]; }

/** Respuesta cruda del back para una fila del listado (StudyResponse enriquecido). */
export interface StudyListItemResponse {
  id: number;
  protocolId: number;
  patientId: number;
  currentStatus: StudyStatus;
  expectedResultsCount: number;
  signedResultsCount: number;
  protocolCode: string;
  patientName: string;
  patientSex: string | null;
  patientBirthDate: string | null; // ISO date
  date: string;                    // ISO
  analysisCount: number;
  determinationCount: number;
  signedAnalysisCount: number;
}

/** Page<T> de Spring Data (solo lo que consumimos). */
export interface Page<T> {
  content: T[];
  totalElements: number;
}

/** Fila del listado de Validación (modelo de UI). */
export interface ValidationListRow {
  studyId: number;
  protocolId: number;
  protocolCode: string;
  patientName: string;
  patientSex: string | null;
  patientBirthDate: string | null;
  date: string;
  currentStatus: StudyStatus;
  analysisCount: number;
  determinationCount: number;
  signedAnalysisCount: number;
}

/** Estado de firma derivado de currentStatus, para badge y filtro. */
export type EstadoFirma = 'sin' | 'parcial' | 'total';

export function estadoFirmaDe(status: StudyStatus): EstadoFirma {
  switch (status) {
    case 'PENDING': return 'sin';
    case 'PARTIALLY_SIGNED': return 'parcial';
    case 'READY_FOR_SIGNATURE':
    case 'CLOSED': return 'total';
  }
}

export function badgeFirma(status: StudyStatus): [string, string] {
  switch (estadoFirmaDe(status)) {
    case 'sin': return ['st-sin', 'Sin firma'];
    case 'parcial': return ['st-parcial', 'Firma parcial'];
    case 'total': return ['st-total', 'Firma total'];
  }
}

export function badgeResultado(status: ResultStatus): [string, string] {
  switch (status) {
    case 'PENDING': return ['st-sin', 'Pendiente'];
    case 'VALIDATING': return ['st-parcial', 'Validando'];
    case 'VALIDATED': return ['st-cargado', 'Validado'];
    case 'SIGNED': return ['st-total', 'Firmado'];
    case 'REJECTED': return ['st-sin', 'Rechazado'];
  }
}

/** Mapea la respuesta cruda del back a la fila de UI. */
export function toValidationListRow(r: StudyListItemResponse): ValidationListRow {
  return {
    studyId: r.id,
    protocolId: r.protocolId,
    protocolCode: r.protocolCode,
    patientName: r.patientName,
    patientSex: r.patientSex,
    patientBirthDate: r.patientBirthDate,
    date: r.date,
    currentStatus: r.currentStatus,
    analysisCount: r.analysisCount,
    determinationCount: r.determinationCount,
    signedAnalysisCount: r.signedAnalysisCount,
  };
}

export interface DetalleDeterminacion {
  determinationId: number; name: string; value: string;
  unit: string; referenceRange: string;
  aggregateOutcome: ValidationOutcome | null;
  manualOutcome: ValidationOutcome | null;
  outOfRange: boolean;
}
export interface DetalleResultado {
  resultId: number; status: ResultStatus; sectionId: number | null;
  determinations: DetalleDeterminacion[];
}
export interface DetalleEstudioHeader {
  protocolId: number; currentStatus: StudyStatus;
  expectedResultsCount: number; signedResultsCount: number; patientId: number;
}
export interface DetalleEstudioResponse { study: DetalleEstudioHeader; results: DetalleResultado[]; }
export interface DetalleEstudio extends DetalleEstudioResponse {
  patientName?: string; patientSex?: string | null; patientBirthDate?: string | null;
}
