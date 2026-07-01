import { createReducer, on } from '@ngrx/store';
import { initialFinancieroState, FinancieroState } from './financiero.state';
import {
  loadCashRegisters, loadCashRegistersSuccess, loadCashRegistersFailure,
  createCashRegisterSuccess, createCashRegisterFailure,
  deactivateCashRegisterFailure,
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivitySuccess,
  openSessionSuccess, openSessionFailure,
  closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
  loadBranchOtherMedia, loadBranchOtherMediaSuccess, loadBranchOtherMediaFailure,
  loadBranchesSummary, loadBranchesSummarySuccess, loadBranchesSummaryNotModified, loadBranchesSummaryFailure,
  registerBranchMovementSuccess, registerBranchMovementFailure,
  loadBankAccounts, loadBankAccountsSuccess, loadBankAccountsFailure,
  createBankAccount, createBankAccountSuccess, createBankAccountFailure,
  updateBankAccount, updateBankAccountSuccess, updateBankAccountFailure,
  deactivateBankAccountFailure,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, loadPaymentSuccess, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  registerPayment, registerPaymentSuccess, registerPaymentFailure, resetCobro,
  loadFiscalConfig, loadFiscalConfigSuccess, loadFiscalConfigFailure,
  saveFiscalConfig, saveFiscalConfigSuccess, saveFiscalConfigFailure,
} from './financiero.actions';

export const initialState = initialFinancieroState;

export const financieroReducer = createReducer(
  initialState,

  // ── subcajas ───────────────────────────────────────────────────────────────
  on(loadCashRegisters, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, registersLoading: true, error: null },
  })),
  on(loadCashRegistersSuccess, (state, { registers }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, registers, registersLoading: false },
  })),
  on(loadCashRegistersFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, registersLoading: false, error },
  })),
  on(createCashRegisterSuccess, (state, { register }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, registers: [...state.caja.registers, register], error: null },
  })),
  on(createCashRegisterFailure, deactivateCashRegisterFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── cargar sesión abierta ──────────────────────────────────────────────────
  on(loadOpenSession, (state): FinancieroState => ({
    ...state,
    // Limpiar activity: al cambiar de subcaja no queremos mostrar los movimientos/cobros
    // de la caja anterior mientras carga la nueva (evita conteo de cobros stale).
    caja: { ...state.caja, loading: true, activity: null, error: null },
  })),
  on(loadOpenSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, loading: false, error: null },
  })),
  on(sessionNotFound, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session: null, activity: null, loading: false, error: null },
  })),
  on(loadOpenSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, loading: false, error },
  })),

  // ── actividad de sesión ────────────────────────────────────────────────────
  on(loadActivitySuccess, (state, { activity }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, activity },
  })),

  // ── abrir sesión ───────────────────────────────────────────────────────────
  on(openSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, error: null },
  })),
  on(openSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── cerrar sesión ──────────────────────────────────────────────────────────
  on(closeSessionSuccess, (state, { session }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, session, error: null },
  })),
  on(closeSessionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── registrar movimiento ───────────────────────────────────────────────────
  on(registerTransaction, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error: null },
  })),
  on(registerTransactionSuccess, (state): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error: null },
  })),
  on(registerTransactionFailure, (state, { error }): FinancieroState => ({
    ...state,
    caja: { ...state.caja, error },
  })),

  // ── otros medios (sucursal + día) ──────────────────────────────────────────
  on(loadBranchOtherMedia, (state): FinancieroState => ({
    ...state,
    otros: { ...state.otros, loading: true, error: null },
  })),
  on(loadBranchOtherMediaSuccess, (state, { data }): FinancieroState => ({
    ...state,
    otros: { ...state.otros, data, loading: false, error: null },
  })),
  on(loadBranchOtherMediaFailure, (state, { error }): FinancieroState => ({
    ...state,
    otros: { ...state.otros, loading: false, error },
  })),

  // ── Resumen multi-sucursal (KAN-161) ───────────────────────────────────────
  on(loadBranchesSummary, (state): FinancieroState => ({
    ...state,
    sucursales: { ...state.sucursales, loading: true, error: null },
  })),
  on(loadBranchesSummarySuccess, (state, { data }): FinancieroState => ({
    ...state,
    sucursales: { ...state.sucursales, data, loading: false, error: null },
  })),
  on(loadBranchesSummaryNotModified, (state): FinancieroState => ({
    ...state,
    sucursales: { ...state.sucursales, loading: false },
  })),
  on(loadBranchesSummaryFailure, (state, { error }): FinancieroState => ({
    ...state,
    sucursales: { ...state.sucursales, loading: false, error },
  })),
  on(registerBranchMovementSuccess, (state): FinancieroState => ({
    ...state,
    otros: { ...state.otros, error: null },
  })),
  on(registerBranchMovementFailure, (state, { error }): FinancieroState => ({
    ...state,
    otros: { ...state.otros, error },
  })),

  // ── cuentas destino (bank-accounts) ────────────────────────────────────────
  on(loadBankAccounts, (state): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, loading: true, error: null },
  })),
  on(loadBankAccountsSuccess, (state, { accounts }): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, list: accounts, loading: false, error: null },
  })),
  on(loadBankAccountsFailure, (state, { error }): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, loading: false, error },
  })),
  on(createBankAccount, updateBankAccount, (state): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, saving: true, error: null },
  })),
  on(createBankAccountSuccess, (state, { account }): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, list: [...state.cuentas.list, account], saving: false, error: null },
  })),
  on(updateBankAccountSuccess, (state, { account }): FinancieroState => ({
    ...state,
    cuentas: {
      ...state.cuentas,
      // si la cuenta quedó inactiva sale del listado de activas
      list: account.active
        ? state.cuentas.list.map(a => (a.id === account.id ? account : a))
        : state.cuentas.list.filter(a => a.id !== account.id),
      saving: false,
      error: null,
    },
  })),
  on(createBankAccountFailure, updateBankAccountFailure, (state, { error }): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, saving: false, error },
  })),
  on(deactivateBankAccountFailure, (state, { error }): FinancieroState => ({
    ...state,
    cuentas: { ...state.cuentas, error },
  })),

  // ── cobros: listar pagos ───────────────────────────────────────────────────
  on(loadPayments, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(loadPaymentsSuccess, (state, { items }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, list: items, loading: false, error: null },
  })),
  on(loadPaymentsFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── cobros: detalle de pago ────────────────────────────────────────────────
  on(loadPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(loadPaymentSuccess, (state, { payment }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, selected: payment, loading: false, error: null },
  })),
  on(loadPaymentFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── cobros: cancelar pago ──────────────────────────────────────────────────
  on(cancelPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(cancelPaymentSuccess, (state, { payment }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, selected: payment, loading: false, error: null },
  })),
  on(cancelPaymentFailure, (state, { error }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: false, error },
  })),

  // ── cobro: registrar pago ─────────────────────────────────────────────────
  on(registerPayment, (state): FinancieroState => ({
    ...state, cobro: { ...state.cobro, submitting: true, error: null },
  })),
  on(registerPaymentSuccess, (state, { result }): FinancieroState => ({
    ...state, cobro: { submitting: false, result, error: null },
  })),
  on(registerPaymentFailure, (state, { error }): FinancieroState => ({
    ...state, cobro: { ...state.cobro, submitting: false, error },
  })),
  on(resetCobro, (state): FinancieroState => ({
    ...state, cobro: { submitting: false, result: null, error: null },
  })),

  // ── config fiscal: cargar ──────────────────────────────────────────────────
  on(loadFiscalConfig, (state): FinancieroState => ({
    ...state,
    config: { ...state.config, error: null },
  })),
  on(loadFiscalConfigSuccess, (state, { config }): FinancieroState => ({
    ...state,
    config: { ...state.config, current: config, error: null },
  })),
  on(loadFiscalConfigFailure, (state, { error }): FinancieroState => ({
    ...state,
    config: { ...state.config, error },
  })),

  // ── config fiscal: guardar ─────────────────────────────────────────────────
  on(saveFiscalConfig, (state): FinancieroState => ({
    ...state,
    config: { ...state.config, saving: true, error: null },
  })),
  on(saveFiscalConfigSuccess, (state, { config }): FinancieroState => ({
    ...state,
    config: { ...state.config, current: config, saving: false, error: null },
  })),
  on(saveFiscalConfigFailure, (state, { error }): FinancieroState => ({
    ...state,
    config: { ...state.config, saving: false, error },
  })),
);
