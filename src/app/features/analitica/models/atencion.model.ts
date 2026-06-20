export enum AttentionState {
  REGISTERING_GENERAL_DATA = 'REGISTERING_GENERAL_DATA',
  REGISTERING_ANALYSES     = 'REGISTERING_ANALYSES',
  ON_COLLECTION_PROCESS    = 'ON_COLLECTION_PROCESS',
  ON_BILLING_PROCESS       = 'ON_BILLING_PROCESS',
  AWAITING_CONFIRMATION    = 'AWAITING_CONFIRMATION',
  AWAITING_EXTRACTION      = 'AWAITING_EXTRACTION',
  IN_EXTRACTION            = 'IN_EXTRACTION',
  FINISHED                 = 'FINISHED',
  CANCELED                 = 'CANCELED',
  FAILED                   = 'FAILED',
}

export const TERMINAL_STATES: ReadonlySet<AttentionState> = new Set([
  AttentionState.FINISHED,
  AttentionState.CANCELED,
  AttentionState.FAILED,
]);

export function isTerminal(state: AttentionState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Estados en los que la secretaría todavía tiene una fase abierta sobre la atención y
 * por lo tanto puede "Retomar" el wizard. A partir de AWAITING_EXTRACTION la atención
 * ya pasó a manos de extracción (la fase de secretaría está completada), así que el
 * botón debe ser "Ver" — entrar a "Retomar" mostraba "fase completada". Los estados
 * terminales tampoco son retomables.
 */
const SECRETARY_RESUMABLE_STATES: ReadonlySet<AttentionState> = new Set([
  AttentionState.REGISTERING_GENERAL_DATA,
  AttentionState.REGISTERING_ANALYSES,
  AttentionState.ON_COLLECTION_PROCESS,
  AttentionState.ON_BILLING_PROCESS,
  AttentionState.AWAITING_CONFIRMATION,
]);

export function isSecretaryResumable(state: AttentionState): boolean {
  return SECRETARY_RESUMABLE_STATES.has(state);
}

export interface AnalysisAuthorizationResponse {
  id: number;
  analysisId: number;
  isAuthorized: boolean;
  active: boolean;
}

export interface AttentionResponse {
  id: number;
  tenantId: number;
  attentionNumber: string;
  publicCode: string | null;
  patientId: number | null;
  doctorId: number | null;
  branchId: number | null;
  insurancePlanId: number | null;
  indications: string | null;
  paymentId: number | null;
  protocolId: number | null;
  extractorId: number | null;
  attentionBox: number | null;
  deskAttentionBox: number | null;
  prescriptionFileUrl: string | null;
  isUrgent: boolean;
  authorizationNumber: string | null;
  observations: string | null;
  cancellationReason: string | null;
  cancelledAtState: AttentionState | null;
  attentionState: AttentionState;
  mostAdvancedState: AttentionState;
  analysisAuthorizations: AnalysisAuthorizationResponse[];
  copaymentAmount: number | null;
  // --- Campos opcionales: presentes según el endpoint (el listado los completa todos). ---
  // Motivo registrado cuando el extractor marca "no se presentó" (cancelación de extracción,
  // distinto de cancellationReason que es la cancelación terminal de la atención).
  extractionCancellationReason?: string | null;
  // Datos de paciente enriquecidos por el backend en el listado (ausentes en endpoints de detalle).
  patientFullName?: string | null;
  patientDni?: string | null;
  // Timestamps ISO-8601 (audit). createdAt = alta de la atención (fecha de la tabla/orden).
  createdAt?: string | null;
  updatedAt?: string | null;
}

// Request DTOs ---------------------------------------------------------------

export interface CreateBlankAttentionRequest {
  branchId: number;
  patientId: number;
  attentionNumber: string;
  deskAttentionBox?: number | null;
  queueEntryId?: number | null;
}

export interface CreatePreFilledAttentionRequest {
  appointmentId: number;
  attentionNumber: string;
  deskAttentionBox?: number | null;
  queueEntryId?: number | null;
}

export interface AssignGeneralDataRequest {
  patientId: number;
  doctorId: number | null;
  insurancePlanId: number | null;
  indications: string | null;
}

export interface AddAnalysisItemRequest {
  analysisId: number;
  isAuthorized: boolean;
}

export interface AddAnalysisListRequest {
  items: AddAnalysisItemRequest[];
  isUrgent: boolean;
  authorizationNumber: string | null;
}

export interface AddPaymentRequest {
  /**
   * Opcional: en el cobro en atención se entra a la fase de cobro SIN pago todavía
   * (el pago se registra en facturación). null = transición de fase pura.
   */
  paymentId: number | null;
}

export interface CancelAttentionRequest {
  cancellationReason: string;
}

export interface AddObservationsRequest {
  observations: string;
}

export interface SetCopaymentRequest {
  copaymentAmount: number | null;
}

export interface SetAuthorizationNumberRequest {
  authorizationNumber: string | null;
}

// Catalog model (CORE) — used by the analysis picker in the atención wizard
export interface Analysis {
  id: number;
  shortCode: string;
  name: string;
  familyName: string | null;
  ubCount: number | null; // unidades bioquímicas; null si no configurado
}

export interface AnalysisDetail extends Analysis {
  description: string | null;
  determinations: ReadonlyArray<{ id: number; name: string }>;
  processingTime: number | null;
  processingTimeUnit: string | null; // 'MINUTES' | 'HOURS' | 'DAYS' | ...
  nbuCode: string | null;
}
