import { createAction, props } from '@ngrx/store';
import { CashSession, SessionActivity, TransactionType, PaymentListItem, Payment, PaymentStatus, TenantFiscalConfig, FiscalProvider, CreatePaymentRequest, RegisterPaymentResponse, CashRegister, BankAccount, BankAccountInput, BranchOtherMedia, RegisterBranchMovementInput, MovementsFeed } from '../models/financiero.model';
import {
  SettlementSummary, SettlementDetail, SettlementFilters, PendingService,
  GenerateSettlementBody, InformSettlementBody, CancelSettlementBody, RegisterCollectionBody,
  PreviewDetailBody, SettlementPreviewDetail, InsurerPlanOption,
} from '../models/liquidaciones.model';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

// ── Caja: listar subcajas de la sucursal ─────────────────────────────────────
export const loadCashRegisters = createAction(
  '[Financiero Caja] Load Cash Registers',
  props<{ branchId: number }>(),
);
export const loadCashRegistersSuccess = createAction(
  '[Financiero Caja API] Load Cash Registers Success',
  props<{ registers: CashRegister[] }>(),
);
export const loadCashRegistersFailure = createAction(
  '[Financiero Caja API] Load Cash Registers Failure',
  props<{ error: string }>(),
);

// ── Caja: crear / baja de subcaja (admin) ────────────────────────────────────
export const createCashRegister = createAction(
  '[Financiero Caja] Create Cash Register',
  props<{ branchId: number; name: string }>(),
);
export const createCashRegisterSuccess = createAction(
  '[Financiero Caja API] Create Cash Register Success',
  props<{ register: CashRegister }>(),
);
export const createCashRegisterFailure = createAction(
  '[Financiero Caja API] Create Cash Register Failure',
  props<{ error: string }>(),
);
export const deactivateCashRegister = createAction(
  '[Financiero Caja] Deactivate Cash Register',
  props<{ id: number; branchId: number }>(),
);
export const deactivateCashRegisterSuccess = createAction(
  '[Financiero Caja API] Deactivate Cash Register Success',
  props<{ branchId: number }>(),
);
export const deactivateCashRegisterFailure = createAction(
  '[Financiero Caja API] Deactivate Cash Register Failure',
  props<{ error: string }>(),
);

// ── Caja: cargar sesión abierta de la subcaja ────────────────────────────────
export const loadOpenSession = createAction(
  '[Financiero Caja] Load Open Session',
  props<{ cashRegisterId: number }>(),
);
export const loadOpenSessionSuccess = createAction(
  '[Financiero Caja API] Load Open Session Success',
  props<{ session: CashSession }>(),
);
export const sessionNotFound = createAction(
  '[Financiero Caja API] Session Not Found',
);
export const loadOpenSessionFailure = createAction(
  '[Financiero Caja API] Load Open Session Failure',
  props<{ error: string }>(),
);

// ── Caja: actividad de sesión (polleada, ETag/304) ───────────────────────────
export const loadActivity = createAction(
  '[Financiero Caja] Load Activity',
  props<{ sessionId: number }>(),
);
export const loadActivitySuccess = createAction(
  '[Financiero Caja API] Load Activity Success',
  props<{ activity: SessionActivity }>(),
);
export const loadActivityNotModified = createAction(
  '[Financiero Caja API] Load Activity Not Modified',
);
export const loadActivityFailure = createAction(
  '[Financiero Caja API] Load Activity Failure',
  props<{ error: string }>(),
);

// ── Caja: abrir sesión ───────────────────────────────────────────────────────
export const openSession = createAction(
  '[Financiero Caja] Open Session',
  props<{ cashRegisterId: number; openingAmount: number }>(),
);
export const openSessionSuccess = createAction(
  '[Financiero Caja API] Open Session Success',
  props<{ session: CashSession }>(),
);
export const openSessionFailure = createAction(
  '[Financiero Caja API] Open Session Failure',
  props<{ error: string }>(),
);

// ── Caja: cerrar sesión ──────────────────────────────────────────────────────
export const closeSession = createAction(
  '[Financiero Caja] Close Session',
  props<{ id: number; declaredAmount: number }>(),
);
export const closeSessionSuccess = createAction(
  '[Financiero Caja API] Close Session Success',
  props<{ session: CashSession }>(),
);
export const closeSessionFailure = createAction(
  '[Financiero Caja API] Close Session Failure',
  props<{ error: string }>(),
);

// ── Caja: registrar movimiento manual EFECTIVO ───────────────────────────────
export const registerTransaction = createAction(
  '[Financiero Caja] Register Transaction',
  props<{ id: number; body: { cashRegisterId: number; type: TransactionType; amount: number; description: string } }>(),
);
export const registerTransactionSuccess = createAction(
  '[Financiero Caja API] Register Transaction Success',
);
export const registerTransactionFailure = createAction(
  '[Financiero Caja API] Register Transaction Failure',
  props<{ error: string }>(),
);

// ── Otros medios (sucursal+día): vista + movimiento manual no-efectivo ────────
export const loadBranchOtherMedia = createAction(
  '[Financiero Otros] Load Branch Other Media',
  props<{ branchId: number; from: string; to: string }>(),
);
export const loadBranchOtherMediaSuccess = createAction(
  '[Financiero Otros API] Load Branch Other Media Success',
  props<{ data: BranchOtherMedia }>(),
);
export const loadBranchOtherMediaNotModified = createAction(
  '[Financiero Otros API] Load Branch Other Media Not Modified',
);
export const loadBranchOtherMediaFailure = createAction(
  '[Financiero Otros API] Load Branch Other Media Failure',
  props<{ error: string }>(),
);

// ── Feed de movimientos multi-sucursal (KAN-161) ─────────────────────────────
export const loadMovements = createAction(
  '[Financiero Movimientos] Load Movements',
  props<{ from: string; to: string; branchId: number | null }>(),
);
export const loadMovementsSuccess = createAction(
  '[Financiero Movimientos API] Load Movements Success',
  props<{ data: MovementsFeed }>(),
);
export const loadMovementsNotModified = createAction(
  '[Financiero Movimientos API] Load Movements Not Modified',
);
export const loadMovementsFailure = createAction(
  '[Financiero Movimientos API] Load Movements Failure',
  props<{ error: string }>(),
);

export const registerBranchMovement = createAction(
  '[Financiero Otros] Register Branch Movement',
  props<{ body: RegisterBranchMovementInput }>(),
);
export const registerBranchMovementSuccess = createAction(
  '[Financiero Otros API] Register Branch Movement Success',
);
export const registerBranchMovementFailure = createAction(
  '[Financiero Otros API] Register Branch Movement Failure',
  props<{ error: string }>(),
);

// ── Cuentas destino (bank-accounts) ──────────────────────────────────────────
export const loadBankAccounts = createAction('[Financiero Cuentas] Load Bank Accounts');
export const loadBankAccountsSuccess = createAction(
  '[Financiero Cuentas API] Load Bank Accounts Success',
  props<{ accounts: BankAccount[] }>(),
);
export const loadBankAccountsFailure = createAction(
  '[Financiero Cuentas API] Load Bank Accounts Failure',
  props<{ error: string }>(),
);
export const createBankAccount = createAction(
  '[Financiero Cuentas] Create Bank Account',
  props<{ body: BankAccountInput }>(),
);
export const createBankAccountSuccess = createAction(
  '[Financiero Cuentas API] Create Bank Account Success',
  props<{ account: BankAccount }>(),
);
export const createBankAccountFailure = createAction(
  '[Financiero Cuentas API] Create Bank Account Failure',
  props<{ error: string }>(),
);
export const updateBankAccount = createAction(
  '[Financiero Cuentas] Update Bank Account',
  props<{ id: number; body: BankAccountInput & { active: boolean } }>(),
);
export const updateBankAccountSuccess = createAction(
  '[Financiero Cuentas API] Update Bank Account Success',
  props<{ account: BankAccount }>(),
);
export const updateBankAccountFailure = createAction(
  '[Financiero Cuentas API] Update Bank Account Failure',
  props<{ error: string }>(),
);
export const deactivateBankAccount = createAction(
  '[Financiero Cuentas] Deactivate Bank Account',
  props<{ id: number }>(),
);
export const deactivateBankAccountSuccess = createAction(
  '[Financiero Cuentas API] Deactivate Bank Account Success',
);
export const deactivateBankAccountFailure = createAction(
  '[Financiero Cuentas API] Deactivate Bank Account Failure',
  props<{ error: string }>(),
);

// ── Cobros: listar pagos ─────────────────────────────────────────────────────
export const loadPayments = createAction(
  '[Financiero Cobros] Load Payments',
  props<{ branchId?: number; status?: PaymentStatus }>(),
);
export const loadPaymentsSuccess = createAction(
  '[Financiero Cobros API] Load Payments Success',
  props<{ items: PaymentListItem[] }>(),
);
export const loadPaymentsFailure = createAction(
  '[Financiero Cobros API] Load Payments Failure',
  props<{ error: string }>(),
);

// ── Cobros: obtener detalle de pago ──────────────────────────────────────────
// `loadPayment` es SIEMPRE una carga fresca (sin ETag condicional) — la usan la
// carga inicial (ngOnInit) y la recarga post-cancelación. `pollPayment` es la
// única acción que usa el GET condicional (If-None-Match), y solo la dispara el
// tick de polling mientras el comprobante está PENDING (ver KAN-245: si la carga
// inicial usara ETag, un 304 podía dejar `selected` mostrando el pago de una
// visita anterior en la URL del pago recién pedido).
export const loadPayment = createAction(
  '[Financiero Cobros] Load Payment',
  props<{ id: number }>(),
);
export const pollPayment = createAction(
  '[Financiero Cobros] Poll Payment',
  props<{ id: number }>(),
);
export const loadPaymentSuccess = createAction(
  '[Financiero Cobros API] Load Payment Success',
  props<{ payment: Payment }>(),
);
export const loadPaymentNotModified = createAction(
  '[Financiero Cobros API] Load Payment Not Modified',
  props<{ id: number }>(),
);
export const loadPaymentFailure = createAction(
  '[Financiero Cobros API] Load Payment Failure',
  props<{ error: string }>(),
);

// ── Cobros: cancelar pago ────────────────────────────────────────────────────
export const cancelPayment = createAction(
  '[Financiero Cobros] Cancel Payment',
  props<{ id: number; reason: string }>(),
);
export const cancelPaymentSuccess = createAction(
  '[Financiero Cobros API] Cancel Payment Success',
  props<{ payment: Payment }>(),
);
export const cancelPaymentFailure = createAction(
  '[Financiero Cobros API] Cancel Payment Failure',
  props<{ error: string }>(),
);

// ── Cobros: descargar comprobante PDF ────────────────────────────────────────
export const downloadComprobante = createAction(
  '[Financiero Cobros] Download Comprobante',
  props<{ paymentId: number }>(),
);
export const downloadComprobanteSuccess = createAction(
  '[Financiero Cobros API] Download Comprobante Success',
);
export const downloadComprobanteFailure = createAction(
  '[Financiero Cobros API] Download Comprobante Failure',
  props<{ error: string }>(),
);

// ── cobro: registrar pago de atención ──
export const registerPayment = createAction(
  '[Financiero Cobro] Register Payment', props<{ body: CreatePaymentRequest }>());
export const registerPaymentSuccess = createAction(
  '[Financiero Cobro] Register Payment Success', props<{ result: RegisterPaymentResponse }>());
export const registerPaymentFailure = createAction(
  '[Financiero Cobro] Register Payment Failure', props<{ error: string }>());
export const resetCobro = createAction('[Financiero Cobro] Reset');

// ── Config fiscal: cargar ────────────────────────────────────────────────────
export const loadFiscalConfig = createAction(
  '[Financiero Config] Load Fiscal Config',
  props<{ tenantId: number }>(),
);
export const loadFiscalConfigSuccess = createAction(
  '[Financiero Config API] Load Fiscal Config Success',
  props<{ config: TenantFiscalConfig }>(),
);
export const loadFiscalConfigFailure = createAction(
  '[Financiero Config API] Load Fiscal Config Failure',
  props<{ error: string }>(),
);

// ── Config fiscal: guardar ───────────────────────────────────────────────────
export const saveFiscalConfig = createAction(
  '[Financiero Config] Save Fiscal Config',
  props<{ body: { targetTenantId: number; provider: FiscalProvider; invoicePointOfSale?: string; configJson?: string } }>(),
);
export const saveFiscalConfigSuccess = createAction(
  '[Financiero Config API] Save Fiscal Config Success',
  props<{ config: TenantFiscalConfig }>(),
);
export const saveFiscalConfigFailure = createAction(
  '[Financiero Config API] Save Fiscal Config Failure',
  props<{ error: string }>(),
);

// ── Liquidaciones: listar (polleable ETag/304) ───────────────────────────────
export const loadSettlements = createAction(
  '[Liquidaciones] Load Settlements', props<{ filters: SettlementFilters }>());
export const loadSettlementsSuccess = createAction(
  '[Liquidaciones API] Load Settlements Success', props<{ items: SettlementSummary[] }>());
export const loadSettlementsNotModified = createAction(
  '[Liquidaciones API] Load Settlements Not Modified');
export const loadSettlementsFailure = createAction(
  '[Liquidaciones API] Load Settlements Failure', props<{ error: string }>());

// ── Liquidaciones: detalle ───────────────────────────────────────────────────
export const loadSettlement = createAction(
  '[Liquidaciones] Load Settlement', props<{ id: number }>());
export const loadSettlementSuccess = createAction(
  '[Liquidaciones API] Load Settlement Success', props<{ settlement: SettlementDetail }>());
export const loadSettlementFailure = createAction(
  '[Liquidaciones API] Load Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: generar (SIMPLE) ──────────────────────────────────────────
export const generateSettlement = createAction(
  '[Liquidaciones] Generate Settlement', props<{ body: GenerateSettlementBody }>());
export const generateSettlementSuccess = createAction(
  '[Liquidaciones API] Generate Settlement Success', props<{ settlement: SettlementDetail }>());
export const generateSettlementFailure = createAction(
  '[Liquidaciones API] Generate Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: informar ──────────────────────────────────────────────────
export const informSettlement = createAction(
  '[Liquidaciones] Inform Settlement', props<{ id: number; body: InformSettlementBody }>());
export const informSettlementSuccess = createAction(
  '[Liquidaciones API] Inform Settlement Success', props<{ settlement: SettlementDetail }>());
export const informSettlementFailure = createAction(
  '[Liquidaciones API] Inform Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: anular ────────────────────────────────────────────────────
export const cancelSettlement = createAction(
  '[Liquidaciones] Cancel Settlement', props<{ id: number; body: CancelSettlementBody }>());
export const cancelSettlementSuccess = createAction(
  '[Liquidaciones API] Cancel Settlement Success', props<{ id: number }>());
export const cancelSettlementFailure = createAction(
  '[Liquidaciones API] Cancel Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: registrar cobro ───────────────────────────────────────────
export const registerSettlementCollection = createAction(
  '[Liquidaciones] Register Settlement Collection', props<{ id: number; body: RegisterCollectionBody }>());
export const registerSettlementCollectionSuccess = createAction(
  '[Liquidaciones API] Register Settlement Collection Success', props<{ settlement: SettlementDetail }>());
export const registerSettlementCollectionFailure = createAction(
  '[Liquidaciones API] Register Settlement Collection Failure', props<{ error: string }>());

// ── Liquidaciones: exportar a Excel ──────────────────────────────────────────
export const exportSettlement = createAction(
  '[Liquidaciones] Export Settlement', props<{ id: number; settlementNumber: number }>());
export const exportSettlementSuccess = createAction(
  '[Liquidaciones API] Export Settlement Success');
export const exportSettlementFailure = createAction(
  '[Liquidaciones API] Export Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: prestaciones pendientes (polleable ETag/304) ──────────────
export const loadPendingServices = createAction('[Liquidaciones] Load Pending Services');
export const loadPendingServicesSuccess = createAction(
  '[Liquidaciones API] Load Pending Services Success', props<{ items: PendingService[] }>());
export const loadPendingServicesNotModified = createAction(
  '[Liquidaciones API] Load Pending Services Not Modified');
export const loadPendingServicesFailure = createAction(
  '[Liquidaciones API] Load Pending Services Failure', props<{ error: string }>());

// ── Liquidaciones: índice de OS (id→nombre) ──────────────────────────────────
export const loadInsurersIndex = createAction('[Liquidaciones] Load Insurers Index');
export const loadInsurersIndexSuccess = createAction(
  '[Liquidaciones API] Load Insurers Index Success', props<{ insurers: InsurerSummary[] }>());
export const loadInsurersIndexFailure = createAction(
  '[Liquidaciones API] Load Insurers Index Failure', props<{ error: string }>());

// ── Liquidaciones: planes de la OS elegida (multiselect del paso Datos) ───────
export const loadInsurerPlans = createAction(
  '[Liquidaciones] Load Insurer Plans', props<{ insurerId: number }>());
export const loadInsurerPlansSuccess = createAction(
  '[Liquidaciones API] Load Insurer Plans Success', props<{ plans: InsurerPlanOption[] }>());
export const loadInsurerPlansFailure = createAction(
  '[Liquidaciones API] Load Insurer Plans Failure', props<{ error: string }>());

// ── Liquidaciones: preview detallado (prestaciones + análisis + montos) ───────
export const loadPreviewDetail = createAction(
  '[Liquidaciones] Load Preview Detail', props<{ body: PreviewDetailBody }>());
export const loadPreviewDetailSuccess = createAction(
  '[Liquidaciones API] Load Preview Detail Success', props<{ preview: SettlementPreviewDetail }>());
export const loadPreviewDetailFailure = createAction(
  '[Liquidaciones API] Load Preview Detail Failure', props<{ error: string }>());
export const resetPreviewDetail = createAction('[Liquidaciones] Reset Preview Detail');
