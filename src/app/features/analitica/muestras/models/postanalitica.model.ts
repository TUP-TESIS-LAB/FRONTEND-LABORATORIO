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
  isUrgent: boolean;
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
  isUrgent: boolean;
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

/**
 * GAP-5: en el LISTADO se distingue el accionable "Listo para firmar"
 * (READY_FOR_SIGNATURE) del terminal "Cerrado" (CLOSED), que `estadoFirmaDe`
 * colapsa en 'total'. El detalle sigue usando `badgeFirma` (3 estados).
 */
export type EstadoFirmaListado = 'sin' | 'parcial' | 'listo' | 'cerrado';

export function estadoFirmaListado(status: StudyStatus): EstadoFirmaListado {
  switch (status) {
    case 'PENDING': return 'sin';
    case 'PARTIALLY_SIGNED': return 'parcial';
    case 'READY_FOR_SIGNATURE': return 'listo';
    case 'CLOSED': return 'cerrado';
  }
}

export function badgeFirmaListado(status: StudyStatus): [string, string] {
  switch (estadoFirmaListado(status)) {
    case 'sin': return ['st-sin', 'Sin firma'];
    case 'parcial': return ['st-parcial', 'Firma parcial'];
    case 'listo': return ['st-cargado', 'Listo para firmar'];
    case 'cerrado': return ['st-total', 'Cerrado'];
  }
}

/** Un estudio accionable (no cerrado) en el listado de Validación. */
export function esAccionable(status: StudyStatus): boolean {
  return status !== 'CLOSED';
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
    isUrgent: r.isUrgent ?? false,
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
  analysisName: string | null; analysisFamily: string | null;
  determinations: DetalleDeterminacion[];
  /**
   * Completitud del resultado (Parte 2 — gate de validación): true cuando TODAS
   * las determinaciones tienen valor cargado. Un resultado incompleto no puede
   * validarse/firmarse. El backend lo expone por resultado.
   * Degradación suave: si el back todavía no lo envía (undefined), se trata como
   * completo (no se bloquea de más). Ver `ValidarProtocoloPage.esCompleto`.
   */
  isComplete?: boolean;
  /**
   * Análisis PENDIENTE (flujo asíncrono por-orden): la orden está activa pero su
   * muestra todavía viaja, por lo que NO tiene resultado materializado. El back lo
   * marca con `pending: true`; trae `analysisName`/`analysisFamily` pero NO trae
   * determinaciones (lista vacía) ni `resultId` real. La UI lo muestra en la lista
   * y en firma con estado neutro y todas las acciones deshabilitadas.
   * Degradación suave: undefined/false (back viejo) = NO pendiente (comportamiento
   * actual). Ver `esPendiente(...)`.
   */
  pending?: boolean;
}

/** True si el análisis está pendiente (sin resultado todavía). Trata undefined como NO pendiente. */
export function esPendiente(r: DetalleResultado): boolean {
  return r.pending === true;
}
export interface DetalleEstudioHeader {
  protocolId: number; currentStatus: StudyStatus;
  expectedResultsCount: number; signedResultsCount: number; patientId: number;
  patientName: string | null; patientSex: string | null; patientBirthDate: string | null;
}
export interface DetalleEstudioResponse { study: DetalleEstudioHeader; results: DetalleResultado[]; }
/**
 * El detalle ahora trae los datos del paciente en el header (backend GAP-4).
 * Se mantienen los campos opcionales de nivel raíz por compatibilidad con el
 * paso por router.state, pero la fuente de verdad es `study.patientName/...`.
 */
export interface DetalleEstudio extends DetalleEstudioResponse {
  patientName?: string; patientSex?: string | null; patientBirthDate?: string | null;
}
