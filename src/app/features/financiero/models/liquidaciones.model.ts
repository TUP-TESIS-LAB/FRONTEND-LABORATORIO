// Tipos del módulo de liquidaciones (settlements) — contrato BE financiero (PR #108).

export type SettlementStatus = 'PENDING' | 'INFORMED' | 'BILLED' | 'CANCELLED';
export type SettlementType = 'SIMPLE' | 'ESPECIAL';

/** Regla de tramo especial (mapea a SpecialRuleDto del backend). */
export interface SpecialRule {
  ruleType: 'BETWEEN' | 'GREATER_THAN';
  fromCount?: number | null;
  toCount?: number | null;
  amount: number;
}
/** Reglas por plan: { planId: SpecialRule[] }. Vacío → SIMPLE. */
export type SpecialRulesByPlan = Record<number, SpecialRule[]>;

/**
 * Valores fijos en $ por análisis, por plan: { planId: { analysisId: monto } }.
 * Un análisis con valor fijo ignora el cálculo por tramo/U.B. — se factura ese monto plano.
 */
export type FixedAmountsByPlan = Record<number, Record<number, number>>;

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

/**
 * Plan de una OS elegible para liquidar, para el multiselect del paso Datos y la
 * lista de convenios debajo. Nunca se expone el id en la UI: se muestra el nombre.
 * Trae el arancel (valor U.B. del convenio vigente) y si tiene convenio vigente.
 */
export interface InsurerPlanOption {
  id: number;
  name: string;
  iva: number;                 // 0 = exento
  arancel: number;             // valor U.B. del convenio vigente
  hasActiveAgreement: boolean; // false → no se puede liquidar contra este plan
}

/**
 * Respuesta cruda de GET /settlements/plans?insurerId — plan + convenio de la OS.
 * Se mapea a `InsurerPlanOption` (planId→id, planName→name, iva null→0).
 */
export interface SettlementPlanResponse {
  planId: number;
  planName: string;
  iva: number | null;          // null = exento
  arancel: number;
  nbuVersionId: number | null;
  hasActiveAgreement: boolean;
}

/** Body de POST /settlements (solo SIMPLE en v1). */
export interface GenerateSettlementBody {
  insurerId: number;
  period: { from: string; to: string };
  specialRulesByPlan?: SpecialRulesByPlan | null;
  excludedAnalysisIdsByPs: Record<number, number[]> | null;
  /** Planes a liquidar. Si no viene / vacío → todos los de la OS (compat). */
  planIds?: number[] | null;
  fixedAmountsByPlan?: FixedAmountsByPlan | null;
}

export interface InformSettlementBody {
  informedDate: string; // 'YYYY-MM-DD'
  informedAmount: number;
  observations?: string;
}

export interface CancelSettlementBody {
  cancellationReason: string;
}

export interface RegisterCollectionBody {
  amount: number;
  method: string; // PaymentMethod (CASH | TRANSFER | QR | ...)
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

/** Exclusiones por prestación: { providedServiceId: [analysisId,...] }. */
export type ExcludedAnalysisIdsByPs = Record<number, number[]>;

/** Body de POST /settlements/preview/detail. */
export interface PreviewDetailBody {
  insurerId: number;
  period: { from: string; to: string };
  excludedAnalysisIdsByPs?: ExcludedAnalysisIdsByPs | null;
  specialRulesByPlan?: SpecialRulesByPlan | null;
  /** Planes a liquidar. Si no viene / vacío → todos los de la OS (compat). */
  planIds?: number[] | null;
  fixedAmountsByPlan?: FixedAmountsByPlan | null;
}

export interface PreviewAnalysis {
  analysisId: number;
  code: string | null;
  name: string;
  ubUnits: number;
  amount: number;
  excluded: boolean;
  /** false = el análisis no está cubierto por la OS (no suma al monto cubierto). */
  authorized: boolean;
  /** Valor fijo asignado en $ (Task 5). Si viene seteado, ignora el cálculo por U.B. */
  fixedAmount?: number | null;
}

export interface PreviewItem {
  providedServiceId: number;
  patientId: number;
  patientName: string;
  patientDni: string | null;
  serviceDate: string;
  authorizationNumber: string | null;
  protocolNumber: string | null;   // N° de protocolo (attention_number)
  planId: number;
  agreementId: number | null;
  ubValue: number | null;
  copaymentAmount: number;
  coveredAmount: number;
  fullyExcluded: boolean;
  analyses: PreviewAnalysis[];
  /** Tramo especial aplicado (null en SIMPLE). */
  appliedFrom?: number | null;
  appliedTo?: number | null;
  appliedUbValue?: number | null;
}

/** Grupo por plan (estilo OSSACRA): subtotales neto/IVA/bruto + sus prestaciones. */
export interface PreviewGroup {
  planId: number;
  planName: string;
  ivaPercentage: number; // 0 = exento
  netAmount: number;
  ivaAmount: number;
  grossAmount: number;
  items: PreviewItem[];
}

/** Respuesta de POST /settlements/preview/detail (contrato KAN-172, agrupado por plan). */
export interface SettlementPreviewDetail {
  insurerId: number;
  proposedNumber: number;
  previewWarning: string | null;
  netAmount: number;
  ivaAmount: number;
  grossAmount: number;
  groups: PreviewGroup[];
}

/** Etiquetas en español para los estados. */
export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: 'Pendiente',
  INFORMED: 'Informada',
  BILLED: 'Facturada',
  CANCELLED: 'Anulada',
};
