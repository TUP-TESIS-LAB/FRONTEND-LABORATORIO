export type PaymentMethod = 'CASH' | 'QR' | 'POSNET' | 'TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatus = 'CREATED' | 'PROCESSED' | 'CANCELLED';
export type TransactionType = 'INGRESS' | 'EGRESS';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type FiscalProvider = 'ARCA' | 'COLPPY' | 'NONE';
export type ComprobanteTipo = 'FACTURA_X' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
/**
 * Estado de emisión ante ARCA. La emisión electrónica es asincrónica: el CAE
 * se resuelve fuera de banda, segundos después del cobro. Los comprobantes no
 * electrónicos (Factura X) no pasan por este flujo — quedan disponibles al
 * instante, por eso el campo es opcional en `FiscalInvoiceReference`.
 */
export type InvoiceEmissionStatus = 'PENDING' | 'EMITTED' | 'FAILED';

export interface CashSession {
  id: number; tenantId: number; cashRegisterId: number; openedByUserId: number;
  openedAt: string; closedAt: string | null; status: CashSessionStatus;
  openingAmount: number; expectedAmount: number | null; declaredAmount: number | null;
  difference: number | null; saldoActual: number | null;
}
export interface SessionActivityRow {
  type: TransactionType; method: PaymentMethod; amount: number;
  description: string | null; reference: string | null; occurredAt: string;
  esEfectivo: boolean; paymentId: number | null;
}
export interface SessionActivity { rows: SessionActivityRow[]; otrosMediosTotal: number; cobrosCount: number; }
export interface Collection { id: number; method: PaymentMethod; amount: number; reference: string | null; }
export interface PaymentDetail { id: number; analysisId: number; coverageId: number | null; covered: boolean; chargedAmount: number; }
export interface FiscalInvoiceReference {
  id: number; paymentId: number; provider: FiscalProvider; comprobanteTipo: ComprobanteTipo;
  internalReference: string | null; externalInvoiceId: string | null; electronic: boolean; isVoid: boolean; emittedAt: string;
  /**
   * Ausente en comprobantes no electrónicos (Factura X) — nunca pasan por el
   * flujo de emisión ARCA. Presente en electrónicos: 'PENDING' hasta que llega
   * el CAE fuera de banda, luego 'EMITTED' o 'FAILED'.
   */
  emissionStatus?: InvoiceEmissionStatus;
  cae?: string | null;
  /** ISO date. */
  caeVencimiento?: string | null;
  puntoVenta?: string | null;
  numeroComprobante?: string | null;
}
/** Cómo se presenta el comprobante en la UI. */
export type ComprobanteDisplayState = 'NONE' | 'PENDING' | 'FAILED' | 'READY';

/**
 * Deriva el estado visible del comprobante.
 *
 * Los no electrónicos (Factura X) no tienen `emissionStatus` — nunca pasan por el flujo de
 * emisión de ARCA — así que están listos apenas existen. Los electrónicos arrancan en PENDING
 * hasta que el CAE llega fuera de banda.
 *
 * Vive acá y no dentro del componente para poder testearlo sin TestBed: `componentRef.setInput()`
 * no llega a los signal inputs bajo el Vitest de este repo (NG0303 / NG0950).
 */
export function comprobanteDisplayState(ref: FiscalInvoiceReference | null | undefined): ComprobanteDisplayState {
  if (!ref) {
    return 'NONE';
  }
  if (ref.emissionStatus === 'PENDING') {
    return 'PENDING';
  }
  if (ref.emissionStatus === 'FAILED') {
    return 'FAILED';
  }
  return 'READY';
}

export interface Payment {
  id: number; tenantId: number; attentionId: number; branchId: number;
  totalAmount: number; copaymentAmount: number; status: PaymentStatus;
  cashTransactionId: number | null; cancelledAt: string | null; cancelReason: string | null;
  collections: Collection[]; details: PaymentDetail[];
  fiscalReference?: FiscalInvoiceReference;
}
export interface PaymentListItem {
  id: number; attentionId: number; branchId: number; totalAmount: number; copaymentAmount: number;
  status: PaymentStatus; createdAt: string; collections: Collection[];
}
export interface TenantFiscalConfig { id: number; targetTenantId: number; provider: FiscalProvider; invoicePointOfSale: string | null; active: boolean; }

// ── Subcajas (multi-caja por sucursal) ────────────────────────────────────────
export interface CashRegister {
  id: number; tenantId: number; branchId: number;
  name: string; active: boolean; deletedAt?: string | null;
}

// ── Cuentas destino del laboratorio (bank-accounts) ───────────────────────────
export interface BankAccount {
  id: number; tenantId: number; label: string;
  cbu: string | null; alias: string | null; banco: string | null;
  titular: string | null; cuit: string | null; active: boolean;
}
/** Body para crear/editar una cuenta destino. */
export interface BankAccountInput {
  label: string;
  cbu?: string | null; alias?: string | null; banco?: string | null;
  titular?: string | null; cuit?: string | null;
}

// ── Otros medios (sucursal + día) ─────────────────────────────────────────────
export type OtherMediaSource = 'ATTENTION_COLLECTION' | 'MANUAL_MOVEMENT';
export interface BranchOtherMediaRow {
  source: OtherMediaSource;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description: string | null;
  reference: string | null;
  occurredAt: string;
  esEfectivo: boolean;
  destinationAccountId: number | null;
  paymentId: number | null;
  movementId: number | null;
}
export interface BranchOtherMedia {
  rows: BranchOtherMediaRow[];
  total: number;
  count: number;
}

/**
 * Feed de movimientos multi-sucursal (KAN-161) — GET /movements?from&to&branchId.
 * Listado plano de movimientos (efectivo + otros medios), cada uno con su sucursal.
 */
export interface MovementRow {
  occurredAt: string;
  branchId: number;
  branchCode: string;
  branchName: string;
  source: 'EFECTIVO' | 'OTROS';
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description: string | null;
  origin: 'COBRO' | 'MANUAL';
}
/** Sucursal para el selector de filtro. */
export interface MovementsBranch {
  id: number;
  code: string;
  name: string;
}
export interface MovementsTotals {
  count: number;
  ingresos: number;
  egresos: number;
  neto: number;
}
export interface MovementsFeed {
  from: string;
  to: string;
  branches: MovementsBranch[];
  movements: MovementRow[];
  totals: MovementsTotals;
}

/**
 * Body de POST /branch-movements — movimiento manual no-efectivo a nivel
 * sucursal+día. method MUST ser ≠ CASH (el efectivo va por la caja).
 */
export interface RegisterBranchMovementInput {
  branchId: number;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description?: string | null;
  destinationAccountId?: number | null;
  // detalle por método (baseline C14)
  transactionId?: string | null;
  senderName?: string | null;
  senderCbuAlias?: string | null;
  cardBrand?: string | null;
  lastFourDigits?: string | null;
  installments?: number | null;
  terminalId?: string | null;
  batchNumber?: string | null;
}

export interface MethodMeta { label: string; icon: string; color: string; esEfectivo: boolean; refLabel: string; }
export const METHOD_META: Record<PaymentMethod, MethodMeta> = {
  CASH:        { label: 'Efectivo',           icon: 'pi-money-bill',             color: 'green',  esEfectivo: true,  refLabel: 'N° de recibo' },
  QR:          { label: 'QR',                 icon: 'pi-qrcode',                 color: 'purple', esEfectivo: false, refLabel: 'ID de operación' },
  POSNET:      { label: 'Posnet',             icon: 'pi-credit-card',            color: 'blue',   esEfectivo: false, refLabel: 'N° de lote / cupón' },
  TRANSFER:    { label: 'Transferencia',      icon: 'pi-arrow-right-arrow-left', color: 'teal',   esEfectivo: false, refLabel: 'CBU / comprobante' },
  CREDIT_CARD: { label: 'Tarjeta de crédito', icon: 'pi-credit-card',            color: 'amber',  esEfectivo: false, refLabel: 'N° de cupón' },
  DEBIT_CARD:  { label: 'Tarjeta de débito',  icon: 'pi-credit-card',            color: 'slate',  esEfectivo: false, refLabel: 'N° de cupón' },
};
export const COMPROBANTE_META: Record<ComprobanteTipo, { label: string; sub: string }> = {
  FACTURA_X: { label: 'Factura X', sub: 'Recibo interno · no fiscal' },
  FACTURA_A: { label: 'Factura A', sub: 'Responsable inscripto' },
  FACTURA_B: { label: 'Factura B', sub: 'Consumidor final' },
  FACTURA_C: { label: 'Factura C', sub: 'Monotributo' },
};
export const PROVIDER_META: Record<FiscalProvider, { label: string; sub: string; icon: string }> = {
  ARCA:   { label: 'ARCA',          sub: 'Facturación electrónica AFIP/ARCA', icon: 'pi-verified' },
  COLPPY: { label: 'Colppy',        sub: 'Integración contable Colppy',       icon: 'pi-sync' },
  NONE:   { label: 'Sin proveedor', sub: 'Solo Factura X (recibos internos)', icon: 'pi-ban' },
};

/** Línea de método de pago para registrar un cobro (request al backend). */
export interface CollectionItemInput {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
}

/** Detalle por análisis del cobro (request). Informativo: el backend solo lo persiste. */
export interface PaymentDetailItemInput {
  analysisId: number;
  coverageId: number | null;
  covered: boolean;
  chargedAmount: number;
}

/** Body de POST /api/v1/financiero/payments — espejo de RegisterPaymentRequest. */
export interface CreatePaymentRequest {
  attentionId: number;
  branchId: number;
  /**
   * KAN-156: subcaja seleccionada sobre la que se imputa el efectivo del cobro.
   * El backend resuelve la sesión OPEN por esta caja (multi-caja). Opcional para
   * compatibilidad: si no se envía, el back cae al comportamiento por sucursal.
   */
  cashRegisterId?: number | null;
  totalAmount: number;
  copaymentAmount: number;
  collections: CollectionItemInput[];
  details: PaymentDetailItemInput[];
  operatorOptedOutOfElectronic: boolean;
}

/** Respuesta 201 de POST /payments. */
export interface RegisterPaymentResponse {
  payment: Payment;
  fiscalReference: FiscalInvoiceReference;
}
