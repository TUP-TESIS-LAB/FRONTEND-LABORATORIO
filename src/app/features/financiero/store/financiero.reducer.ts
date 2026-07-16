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
  loadBranchOtherMedia, loadBranchOtherMediaSuccess, loadBranchOtherMediaNotModified, loadBranchOtherMediaFailure,
  loadMovements, loadMovementsSuccess, loadMovementsNotModified, loadMovementsFailure,
  registerBranchMovementSuccess, registerBranchMovementFailure,
  loadBankAccounts, loadBankAccountsSuccess, loadBankAccountsFailure,
  createBankAccount, createBankAccountSuccess, createBankAccountFailure,
  updateBankAccount, updateBankAccountSuccess, updateBankAccountFailure,
  deactivateBankAccountFailure,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, pollPayment, loadPaymentSuccess, loadPaymentNotModified, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  downloadComprobante, downloadComprobanteSuccess, downloadComprobanteFailure,
  registerPayment, registerPaymentSuccess, registerPaymentFailure, resetCobro,
  loadFiscalConfig, loadFiscalConfigSuccess, loadFiscalConfigFailure,
  saveFiscalConfig, saveFiscalConfigSuccess, saveFiscalConfigFailure,
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlement, loadSettlementSuccess, loadSettlementFailure,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
  informSettlement, informSettlementSuccess, informSettlementFailure,
  cancelSettlement, cancelSettlementSuccess, cancelSettlementFailure,
  registerSettlementCollection, registerSettlementCollectionSuccess, registerSettlementCollectionFailure,
  exportSettlement, exportSettlementSuccess, exportSettlementFailure,
  loadPendingServices, loadPendingServicesSuccess, loadPendingServicesNotModified, loadPendingServicesFailure,
  loadInsurersIndexSuccess, loadInsurerPlansSuccess,
  loadPreviewDetail, loadPreviewDetailSuccess, loadPreviewDetailFailure, resetPreviewDetail,
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
  // `loading` sólo en la carga inicial (aún sin data); en los ticks de polling NO
  // se toca, para no parpadear ni quedar cargando cuando el backend responde 304.
  on(loadBranchOtherMedia, (state): FinancieroState => ({
    ...state,
    otros: { ...state.otros, loading: state.otros.data === null, error: null },
  })),
  on(loadBranchOtherMediaSuccess, (state, { data }): FinancieroState => ({
    ...state,
    otros: { ...state.otros, data, loading: false, error: null },
  })),
  on(loadBranchOtherMediaNotModified, (state): FinancieroState => ({
    ...state,
    otros: { ...state.otros, loading: false },
  })),
  on(loadBranchOtherMediaFailure, (state, { error }): FinancieroState => ({
    ...state,
    otros: { ...state.otros, loading: false, error },
  })),

  // ── Feed de movimientos multi-sucursal (KAN-161) ───────────────────────────
  // `loading` sólo en la carga inicial (aún sin data). En los ticks de polling
  // NO se toca para evitar el parpadeo de la tabla/contador cada 5s (el 304 ya
  // deja la data intacta).
  on(loadMovements, (state): FinancieroState => ({
    ...state,
    movimientos: {
      ...state.movimientos,
      loading: state.movimientos.data === null,
      error: null,
    },
  })),
  on(loadMovementsSuccess, (state, { data }): FinancieroState => ({
    ...state,
    movimientos: { ...state.movimientos, data, loading: false, error: null },
  })),
  on(loadMovementsNotModified, (state): FinancieroState => ({
    ...state,
    movimientos: { ...state.movimientos, loading: false },
  })),
  on(loadMovementsFailure, (state, { error }): FinancieroState => ({
    ...state,
    movimientos: { ...state.movimientos, loading: false, error },
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
  // `loadPayment` (carga inicial/fresca, sin ETag) y `pollPayment` (tick de
  // polling, condicional) comparten el mismo manejo de `loading`/`error` — la
  // diferencia entre ambas vive en el service/efecto (KAN-245).
  on(loadPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(pollPayment, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, loading: true, error: null },
  })),
  on(loadPaymentSuccess, (state, { payment }): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, selected: payment, loading: false, error: null },
  })),
  // Tick de polling sin cambios (304): solo baja el loading, sin tocar `selected`
  // — mismo patrón que loadSettlementsNotModified. Blindaje KAN-245: si el id del
  // 304 no coincide con el `selected` actual (carrera: se navegó a otro pago
  // mientras un tick viejo seguía en vuelo), se ignora por completo — nunca hay
  // que reportar como "al día" un pago que en realidad no es el que se está
  // mostrando.
  on(loadPaymentNotModified, (state, { id }): FinancieroState => {
    if (state.cobros.selected?.id !== id) return state;
    return {
      ...state,
      cobros: { ...state.cobros, loading: false },
    };
  }),
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

  // ── cobros: descargar comprobante PDF ──────────────────────────────────────
  on(downloadComprobante, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, downloadingComprobante: true },
  })),
  on(downloadComprobanteSuccess, downloadComprobanteFailure, (state): FinancieroState => ({
    ...state,
    cobros: { ...state.cobros, downloadingComprobante: false },
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

  // ── liquidaciones: listar ──────────────────────────────────────────────────
  on(loadSettlements, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: true, listError: null },
  })),
  on(loadSettlementsSuccess, (state, { items }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, list: items, listLoading: false, listError: null },
  })),
  on(loadSettlementsNotModified, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: false },
  })),
  on(loadSettlementsFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: false, listError: error },
  })),

  // ── liquidaciones: detalle ─────────────────────────────────────────────────
  on(loadSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, detailLoading: true, detailError: null },
  })),
  on(loadSettlementSuccess, (state, { settlement }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selected: settlement, detailLoading: false, detailError: null },
  })),
  on(loadSettlementFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, detailLoading: false, detailError: error },
  })),

  // ── liquidaciones: generar ─────────────────────────────────────────────────
  on(generateSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: true, generateError: null },
  })),
  on(generateSettlementSuccess, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: false, generateError: null },
  })),
  on(generateSettlementFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: false, generateError: error },
  })),

  // ── liquidaciones: informar / anular / cobrar (lifecycle) ──────────────────
  on(informSettlement, cancelSettlement, registerSettlementCollection, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: true, lifecycleError: null },
  })),
  on(informSettlementSuccess, (state, { settlement }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selected: settlement, lifecycleInProgress: false, lifecycleError: null },
  })),
  on(cancelSettlementSuccess, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: false, lifecycleError: null },
  })),
  on(registerSettlementCollectionSuccess, (state, { settlement }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selected: settlement, lifecycleInProgress: false, lifecycleError: null },
  })),
  on(informSettlementFailure, cancelSettlementFailure, registerSettlementCollectionFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: false, lifecycleError: error },
  })),

  // ── liquidaciones: pendientes ──────────────────────────────────────────────
  on(loadPendingServices, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pendingLoading: true },
  })),
  on(loadPendingServicesSuccess, (state, { items }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pending: items, pendingLoading: false },
  })),
  on(loadPendingServicesNotModified, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pendingLoading: false },
  })),
  on(loadPendingServicesFailure, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pendingLoading: false },
  })),

  // ── liquidaciones: índice de OS + planes de la OS elegida ──────────────────
  on(loadInsurersIndexSuccess, (state, { insurers }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, insurers },
  })),
  on(loadInsurerPlansSuccess, (state, { plans }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, insurerPlans: plans },
  })),

  // ── liquidaciones: preview detallado ───────────────────────────────────────
  on(exportSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, exporting: true },
  })),
  on(exportSettlementSuccess, exportSettlementFailure, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, exporting: false },
  })),

  on(loadPreviewDetail, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, previewLoading: true, previewError: null },
  })),
  on(loadPreviewDetailSuccess, (state, { preview }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, previewDetail: preview, previewLoading: false, previewError: null },
  })),
  on(loadPreviewDetailFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, previewLoading: false, previewError: error },
  })),
  on(resetPreviewDetail, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, previewDetail: null, previewLoading: false, previewError: null },
  })),
);
