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
  authorizationNumber: number | null;
  observations: string | null;
  cancellationReason: string | null;
  cancelledAtState: AttentionState | null;
  attentionState: AttentionState;
  mostAdvancedState: AttentionState;
  analysisAuthorizations: AnalysisAuthorizationResponse[];
}

// Request DTOs ---------------------------------------------------------------

export interface CreateBlankAttentionRequest {
  branchId: number;
  patientId: number;
  attentionNumber: string;
  deskAttentionBox?: number | null;
}

export interface CreatePreFilledAttentionRequest {
  appointmentId: number;
  attentionNumber: string;
  deskAttentionBox?: number | null;
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
  authorizationNumber: number | null;
}

export interface AddPaymentRequest {
  paymentId: number;
}

export interface CancelAttentionRequest {
  cancellationReason: string;
}

export interface AddObservationsRequest {
  observations: string;
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
