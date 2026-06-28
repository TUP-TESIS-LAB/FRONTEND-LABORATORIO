// Tipos del módulo de liquidaciones (settlements) — contrato BE financiero (PR #108).

export type SettlementStatus = 'PENDING' | 'INFORMED' | 'BILLED' | 'CANCELLED';
export type SettlementType = 'SIMPLE' | 'ESPECIAL';

/**
 * Fila del listado: GET /settlements. OJO: el DTO de listado usa `settlementId`
 * y trae `totalAmount` (no `createdAt`) — distinto del detalle, que usa `id`.
 */
export interface SettlementSummary {
  settlementId: number;
  insurerId: number;
  settlementNumber: number;
  status: SettlementStatus;
  type: SettlementType;
  periodFrom: string;  // 'YYYY-MM-DD'
  periodTo: string;    // 'YYYY-MM-DD'
  totalAmount: number;
}

export interface SettlementAgreement {
  agreementId: number;
  agreementSubtotal: number;
  providedServiceIds: number[];
  rules: unknown[];
}

export interface SettlementPlan {
  planId: number;
  agreements: SettlementAgreement[];
}

/** Detalle: GET /settlements/{id}. */
export interface SettlementDetail {
  id: number;
  insurerId: number;
  settlementNumber: number;
  status: SettlementStatus;
  type: SettlementType;
  periodFrom: string;
  periodTo: string;
  informedDate: string | null;
  informedAmount: number | null;
  paymentId: number | null;
  plans: SettlementPlan[];
  createdAt: string;
}

export interface SettlementFilters {
  insurerId?: number;
  from?: string; // 'YYYY-MM-DD'
  to?: string;   // 'YYYY-MM-DD'
  status?: SettlementStatus;
}

/** Body de POST /settlements (solo SIMPLE en v1). */
export interface GenerateSettlementBody {
  insurerId: number;
  period: { from: string; to: string };
  specialRules: [];
  excludedAnalysisIdsByPs: null;
}

export interface InformSettlementBody {
  informedDate: string; // 'YYYY-MM-DD'
  informedAmount: number;
  observations?: string;
}

export interface CancelSettlementBody {
  cancellationReason: string;
}

/** Prestación pendiente: GET /provided-services/pending. */
export interface PendingService {
  id: number;
  attentionId: number;
  planId: number;
  patientId: number;
  serviceDate: string; // 'YYYY-MM-DD'
  copaymentAmount: number;
  ivaPercentage: number;
  authorizationNumber: string | null;
  settlementAgreementId: number | null; // null = pendiente
  analysisIds: number[];
}

/** Etiquetas en español para los estados. */
export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: 'Pendiente',
  INFORMED: 'Informada',
  BILLED: 'Facturada',
  CANCELLED: 'Anulada',
};
