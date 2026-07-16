import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { FinancieroEffects } from './financiero.effects';
import { FinancieroApiService } from '../services/financiero-api.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadCashRegisters, loadCashRegistersSuccess,
  createCashRegister, createCashRegisterSuccess, createCashRegisterFailure,
  deactivateCashRegister, deactivateCashRegisterSuccess, deactivateCashRegisterFailure,
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivity, loadActivitySuccess, loadActivityNotModified, loadActivityFailure,
  openSession, openSessionSuccess, openSessionFailure,
  closeSession, closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
  loadBranchOtherMedia, loadBranchOtherMediaSuccess, loadBranchOtherMediaNotModified,
  registerBranchMovement, registerBranchMovementSuccess, registerBranchMovementFailure,
  loadBankAccounts, loadBankAccountsSuccess,
  createBankAccount, createBankAccountFailure,
  deactivateBankAccountSuccess,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, loadPaymentSuccess, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  registerPayment, registerPaymentSuccess, registerPaymentFailure,
  loadFiscalConfig, loadFiscalConfigSuccess, loadFiscalConfigFailure,
  saveFiscalConfig, saveFiscalConfigSuccess, saveFiscalConfigFailure,
} from './financiero.actions';
import { NOT_MODIFIED } from '@core/refresh/polling-context';

const openCashSession = {
  id: 100, tenantId: 1, cashRegisterId: 5, openedByUserId: 2,
  openedAt: '2026-06-19T09:00:00Z', closedAt: null, status: 'OPEN' as const,
  openingAmount: 15000, expectedAmount: null, declaredAmount: null,
  difference: null, saldoActual: 18680,
};

describe('FinancieroEffects', () => {
  let actions$: Observable<Action>;
  type Fn = ReturnType<typeof vi.fn>;
  let api: {
    getOpenSession: Fn; getActivity: Fn; openSession: Fn; closeSession: Fn; registerTransaction: Fn;
    listCashRegisters: Fn; createCashRegister: Fn; deactivateCashRegister: Fn;
    getBranchOtherMedia: Fn; registerBranchMovement: Fn;
    listBankAccounts: Fn; createBankAccount: Fn; updateBankAccount: Fn; deactivateBankAccount: Fn;
    listPayments: Fn; getPayment: Fn; cancelPayment: Fn; createPayment: Fn;
    getFiscalConfig: Fn; saveFiscalConfig: Fn;
  };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      getOpenSession: vi.fn(),
      getActivity: vi.fn(),
      openSession: vi.fn(),
      closeSession: vi.fn(),
      registerTransaction: vi.fn(),
      listCashRegisters: vi.fn(),
      createCashRegister: vi.fn(),
      deactivateCashRegister: vi.fn(),
      getBranchOtherMedia: vi.fn(),
      registerBranchMovement: vi.fn(),
      listBankAccounts: vi.fn(),
      createBankAccount: vi.fn(),
      updateBankAccount: vi.fn(),
      deactivateBankAccount: vi.fn(),
      listPayments: vi.fn(),
      getPayment: vi.fn(),
      cancelPayment: vi.fn(),
      createPayment: vi.fn(),
      getFiscalConfig: vi.fn(),
      saveFiscalConfig: vi.fn(),
    };
    notif = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        FinancieroEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: FinancieroApiService, useValue: api },
        { provide: NotificationService, useValue: notif },
      ],
    });
  });

  // ── loadOpenSession$ ───────────────────────────────────────────────────────

  it('loadOpenSession$ emite loadOpenSessionSuccess cuando el backend devuelve sesión', async () => {
    api.getOpenSession.mockReturnValue(of(openCashSession));
    actions$ = of(loadOpenSession({ cashRegisterId: 5 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadOpenSession$);
    expect(api.getOpenSession).toHaveBeenCalledWith(5);
    expect(action).toEqual(loadOpenSessionSuccess({ session: openCashSession }));
  });

  it('loadOpenSession$ emite sessionNotFound cuando el backend devuelve null', async () => {
    api.getOpenSession.mockReturnValue(of(null));
    actions$ = of(loadOpenSession({ cashRegisterId: 5 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadOpenSession$);
    expect(action).toEqual(sessionNotFound());
  });

  it('loadOpenSession$ mapea errores a loadOpenSessionFailure', async () => {
    api.getOpenSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadOpenSession({ cashRegisterId: 5 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadOpenSession$);
    expect(action.type).toBe('[Financiero Caja API] Load Open Session Failure');
  });

  // ── loadActivity$ ──────────────────────────────────────────────────────────

  it('loadActivity$ emite loadActivitySuccess cuando hay datos nuevos', async () => {
    const activity = { rows: [], otrosMediosTotal: 0, cobrosCount: 0 };
    api.getActivity.mockReturnValue(of(activity));
    actions$ = of(loadActivity({ sessionId: 100 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadActivity$);
    expect(api.getActivity).toHaveBeenCalledWith(100);
    expect(action).toEqual(loadActivitySuccess({ activity }));
  });

  it('loadActivity$ emite loadActivityNotModified cuando recibe 304', async () => {
    api.getActivity.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadActivity({ sessionId: 100 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadActivity$);
    expect(action).toEqual(loadActivityNotModified());
  });

  it('loadActivity$ mapea errores a loadActivityFailure', async () => {
    api.getActivity.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadActivity({ sessionId: 100 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadActivity$);
    expect(action.type).toBe('[Financiero Caja API] Load Activity Failure');
  });

  // ── openSession$ ───────────────────────────────────────────────────────────

  it('openSession$ ante éxito muestra notif.success y emite openSessionSuccess', async () => {
    api.openSession.mockReturnValue(of(openCashSession));
    actions$ = of(openSession({ cashRegisterId: 5, openingAmount: 15000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect(api.openSession).toHaveBeenCalledWith(5, 15000);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(openSessionSuccess({ session: openCashSession }));
  });

  it('openSession$ ante 409 mapea el mensaje en español', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(openSession({ cashRegisterId: 5, openingAmount: 1000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect((action as ReturnType<typeof openSessionFailure>).error).toBe('Ya hay una caja abierta para esta subcaja.');
    expect(notif.error).toHaveBeenCalledWith('Ya hay una caja abierta para esta subcaja.');
  });

  it('openSession$ ante 422 mapea el mensaje correcto', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(openSession({ cashRegisterId: 5, openingAmount: 1000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect((action as ReturnType<typeof openSessionFailure>).error).toBe('No se puede operar: no hay una caja abierta.');
    expect(notif.error).toHaveBeenCalledWith('No se puede operar: no hay una caja abierta.');
  });

  it('openSession$ ante 500 muestra mensaje genérico', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(openSession({ cashRegisterId: 5, openingAmount: 1000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect(action.type).toBe('[Financiero Caja API] Open Session Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── closeSession$ ──────────────────────────────────────────────────────────

  it('closeSession$ ante éxito muestra notif.success y emite closeSessionSuccess', async () => {
    const closedSession = { ...openCashSession, status: 'CLOSED' as const };
    api.closeSession.mockReturnValue(of(closedSession));
    actions$ = of(closeSession({ id: 100, declaredAmount: 18000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.closeSession$);
    expect(api.closeSession).toHaveBeenCalledWith(100, 18000);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(closeSessionSuccess({ session: closedSession }));
  });

  it('closeSession$ ante error emite closeSessionFailure', async () => {
    api.closeSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(closeSession({ id: 100, declaredAmount: 18000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.closeSession$);
    expect(action.type).toBe('[Financiero Caja API] Close Session Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── registerTransaction$ ───────────────────────────────────────────────────

  it('registerTransaction$ ante éxito muestra notif.success y emite registerTransactionSuccess', async () => {
    api.registerTransaction.mockReturnValue(of({}));
    const body = { cashRegisterId: 5, type: 'INGRESS' as const, amount: 500, description: 'Caja chica' };
    actions$ = of(registerTransaction({ id: 100, body }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerTransaction$);
    expect(api.registerTransaction).toHaveBeenCalledWith(100, body);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(registerTransactionSuccess());
  });

  it('registerTransaction$ ante error emite registerTransactionFailure', async () => {
    api.registerTransaction.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(registerTransaction({ id: 100, body: { cashRegisterId: 5, type: 'EGRESS' as const, amount: 100, description: 'Retiro' } }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerTransaction$);
    expect(action.type).toBe('[Financiero Caja API] Register Transaction Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── loadPayments$ ──────────────────────────────────────────────────────────

  it('loadPayments$ emite loadPaymentsSuccess con la lista devuelta', async () => {
    const items = [{ id: 1, status: 'PROCESSED' }, { id: 2, status: 'CANCELLED' }] as any[];
    api.listPayments.mockReturnValue(of(items));
    actions$ = of(loadPayments({ branchId: 5, status: 'PROCESSED' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadPayments$);
    expect(api.listPayments).toHaveBeenCalledWith({ branchId: 5, status: 'PROCESSED' });
    expect(action).toEqual(loadPaymentsSuccess({ items }));
  });

  it('loadPayments$ sin filtros llama a listPayments con objeto vacío', async () => {
    api.listPayments.mockReturnValue(of([]));
    actions$ = of(loadPayments({}));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadPayments$);
    expect(api.listPayments).toHaveBeenCalledWith({ branchId: undefined, status: undefined });
    expect(action).toEqual(loadPaymentsSuccess({ items: [] }));
  });

  it('loadPayments$ mapea errores a loadPaymentsFailure', async () => {
    api.listPayments.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadPayments({}));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadPayments$);
    expect(action.type).toBe('[Financiero Cobros API] Load Payments Failure');
  });

  // ── loadPayment$ ───────────────────────────────────────────────────────────

  it('loadPayment$ emite loadPaymentSuccess con el pago devuelto', async () => {
    const payment = { id: 9, status: 'PROCESSED', totalAmount: 5000 } as any;
    api.getPayment.mockReturnValue(of(payment));
    actions$ = of(loadPayment({ id: 9 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadPayment$);
    expect(api.getPayment).toHaveBeenCalledWith(9);
    expect(action).toEqual(loadPaymentSuccess({ payment }));
  });

  it('loadPayment$ mapea errores a loadPaymentFailure', async () => {
    api.getPayment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(loadPayment({ id: 99 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadPayment$);
    expect(action.type).toBe('[Financiero Cobros API] Load Payment Failure');
  });

  // ── cancelPayment$ ─────────────────────────────────────────────────────────

  it('cancelPayment$ ante éxito muestra notif.success y emite cancelPaymentSuccess', async () => {
    const payment = { id: 9, status: 'CANCELLED' } as any;
    api.cancelPayment.mockReturnValue(of(payment));
    actions$ = of(cancelPayment({ id: 9, reason: 'cobro duplicado' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.cancelPayment$);
    expect(api.cancelPayment).toHaveBeenCalledWith(9, 'cobro duplicado');
    expect(notif.success).toHaveBeenCalledWith('Pago cancelado · reversa en caja');
    expect(action).toEqual(cancelPaymentSuccess({ payment }));
  });

  it('cancelPayment$ mapea errores a cancelPaymentFailure y muestra notif.error', async () => {
    api.cancelPayment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(cancelPayment({ id: 9, reason: 'duplicado' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.cancelPayment$);
    expect(action.type).toBe('[Financiero Cobros API] Cancel Payment Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── reloadPaymentAfterCancel$ ──────────────────────────────────────────────

  it('reloadPaymentAfterCancel$ despacha loadPayment con el id del pago cancelado', async () => {
    const payment = { id: 9, status: 'CANCELLED' } as any;
    actions$ = of(cancelPaymentSuccess({ payment }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.reloadPaymentAfterCancel$);
    expect(action).toEqual(loadPayment({ id: 9 }));
  });

  // ── loadFiscalConfig$ ──────────────────────────────────────────────────────

  it('loadFiscalConfig$ emite loadFiscalConfigSuccess con la config devuelta', async () => {
    const config = { id: 1, targetTenantId: 2, provider: 'ARCA' as const, invoicePointOfSale: '0001', active: true };
    api.getFiscalConfig.mockReturnValue(of(config));
    actions$ = of(loadFiscalConfig({ tenantId: 2 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadFiscalConfig$);
    expect(api.getFiscalConfig).toHaveBeenCalledWith(2);
    expect(action).toEqual(loadFiscalConfigSuccess({ config }));
  });

  it('loadFiscalConfig$ mapea errores a loadFiscalConfigFailure', async () => {
    api.getFiscalConfig.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadFiscalConfig({ tenantId: 2 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadFiscalConfig$);
    expect(action.type).toBe('[Financiero Config API] Load Fiscal Config Failure');
  });

  // ── saveFiscalConfig$ ──────────────────────────────────────────────────────

  it('saveFiscalConfig$ ante éxito muestra notif.success y emite saveFiscalConfigSuccess', async () => {
    const config = { id: 1, targetTenantId: 2, provider: 'ARCA' as const, invoicePointOfSale: '0001', active: true };
    api.saveFiscalConfig.mockReturnValue(of(config));
    const body = { targetTenantId: 2, provider: 'ARCA' as const };
    actions$ = of(saveFiscalConfig({ body }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.saveFiscalConfig$);
    expect(api.saveFiscalConfig).toHaveBeenCalledWith(body);
    expect(notif.success).toHaveBeenCalledWith('Configuración fiscal guardada');
    expect(action).toEqual(saveFiscalConfigSuccess({ config }));
  });

  it('saveFiscalConfig$ ante error emite saveFiscalConfigFailure y muestra notif.error', async () => {
    api.saveFiscalConfig.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(saveFiscalConfig({ body: { targetTenantId: 2, provider: 'NONE' as const } }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.saveFiscalConfig$);
    expect(action.type).toBe('[Financiero Config API] Save Fiscal Config Failure');
    expect(notif.error).toHaveBeenCalled();
  });

  it('saveFiscalConfig$ ante 500 emite saveFiscalConfigFailure con mensaje genérico', async () => {
    api.saveFiscalConfig.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(saveFiscalConfig({ body: { targetTenantId: 2, provider: 'COLPPY' as const } }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.saveFiscalConfig$);
    expect((action as ReturnType<typeof saveFiscalConfigFailure>).error).toBe('Ocurrió un error al guardar la configuración fiscal.');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── registerPayment$ ───────────────────────────────────────────────────────

  it('registerPayment$ éxito → registerPaymentSuccess con el result', async () => {
    const result = { payment: { id: 5 }, fiscalReference: { id: 1 } } as any;
    api.createPayment.mockReturnValue(of(result));
    actions$ = of(registerPayment({ body: {} as any }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerPayment$);
    expect(api.createPayment).toHaveBeenCalled();
    expect(action).toEqual(registerPaymentSuccess({ result }));
  });

  it('registerPayment$ 409 "caja" → mensaje sin-caja + notif.error', async () => {
    api.createPayment.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'No hay caja abierta para la sucursal indicada' } })));
    actions$ = of(registerPayment({ body: {} as any }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerPayment$);
    expect((action as ReturnType<typeof registerPaymentFailure>).error)
      .toBe('No se puede cobrar: no hay una caja abierta.');
    expect(notif.error).toHaveBeenCalledWith('No se puede cobrar: no hay una caja abierta.');
  });

  it('registerPayment$ 409 "monto" → mensaje de montos', async () => {
    api.createPayment.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'El monto total no coincide con la suma de los métodos de pago' } })));
    actions$ = of(registerPayment({ body: {} as any }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerPayment$);
    expect((action as ReturnType<typeof registerPaymentFailure>).error)
      .toBe('La suma de los medios de pago no coincide con el total.');
  });

  // ── subcajas ─────────────────────────────────────────────────────────────────

  it('loadCashRegisters$ emite success con el listado', async () => {
    const registers = [{ id: 5, name: 'Mostrador', active: true }] as any[];
    api.listCashRegisters.mockReturnValue(of(registers));
    actions$ = of(loadCashRegisters({ branchId: 3 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadCashRegisters$);
    expect(api.listCashRegisters).toHaveBeenCalledWith(3);
    expect(action).toEqual(loadCashRegistersSuccess({ registers }));
  });

  it('createCashRegister$ éxito → success + notif', async () => {
    const register = { id: 9, name: 'Extracciones', active: true } as any;
    api.createCashRegister.mockReturnValue(of(register));
    actions$ = of(createCashRegister({ branchId: 3, name: 'Extracciones' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.createCashRegister$);
    expect(api.createCashRegister).toHaveBeenCalledWith(3, 'Extracciones');
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(createCashRegisterSuccess({ register }));
  });

  it('createCashRegister$ 409 → mensaje "nombre" + notif.error', async () => {
    api.createCashRegister.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(createCashRegister({ branchId: 3, name: 'Mostrador' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.createCashRegister$);
    expect((action as ReturnType<typeof createCashRegisterFailure>).error)
      .toBe('Ya existe una caja con ese nombre en la sucursal.');
    expect(notif.error).toHaveBeenCalled();
  });

  it('deactivateCashRegister$ 422 (sesión abierta) → mensaje claro', async () => {
    api.deactivateCashRegister.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(deactivateCashRegister({ id: 5, branchId: 3 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.deactivateCashRegister$);
    expect((action as ReturnType<typeof deactivateCashRegisterFailure>).error)
      .toBe('No se puede dar de baja: la caja tiene una sesión abierta.');
  });

  it('reloadCashRegistersAfterDeactivate$ re-despacha loadCashRegisters', async () => {
    actions$ = of(deactivateCashRegisterSuccess({ branchId: 3 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.reloadCashRegistersAfterDeactivate$);
    expect(action).toEqual(loadCashRegisters({ branchId: 3 }));
  });

  // ── otros medios ─────────────────────────────────────────────────────────────

  it('loadBranchOtherMedia$ emite success con datos nuevos', async () => {
    const data = { rows: [], total: 0, count: 0 };
    api.getBranchOtherMedia.mockReturnValue(of(data));
    actions$ = of(loadBranchOtherMedia({ branchId: 3, from: 'a', to: 'b' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadBranchOtherMedia$);
    expect(api.getBranchOtherMedia).toHaveBeenCalledWith(3, 'a', 'b');
    expect(action).toEqual(loadBranchOtherMediaSuccess({ data }));
  });

  it('loadBranchOtherMedia$ emite notModified ante 304', async () => {
    api.getBranchOtherMedia.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadBranchOtherMedia({ branchId: 3, from: 'a', to: 'b' }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadBranchOtherMedia$);
    expect(action).toEqual(loadBranchOtherMediaNotModified());
  });

  it('registerBranchMovement$ éxito → success + notif', async () => {
    api.registerBranchMovement.mockReturnValue(of({}));
    const body = { branchId: 3, type: 'INGRESS', method: 'TRANSFER', amount: 1000 } as any;
    actions$ = of(registerBranchMovement({ body }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerBranchMovement$);
    expect(api.registerBranchMovement).toHaveBeenCalledWith(body);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(registerBranchMovementSuccess());
  });

  it('registerBranchMovement$ 422 → mensaje sin leak + notif.error', async () => {
    api.registerBranchMovement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(registerBranchMovement({ body: {} as any }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerBranchMovement$);
    expect((action as ReturnType<typeof registerBranchMovementFailure>).error)
      .toBe('Faltan datos del medio de pago o la cuenta destino no es válida.');
    expect(notif.error).toHaveBeenCalled();
  });

  // ── cuentas destino ──────────────────────────────────────────────────────────

  it('loadBankAccounts$ emite success con el listado', async () => {
    const accounts = [{ id: 1, label: 'Galicia', active: true }] as any[];
    api.listBankAccounts.mockReturnValue(of(accounts));
    actions$ = of(loadBankAccounts());
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadBankAccounts$);
    expect(action).toEqual(loadBankAccountsSuccess({ accounts }));
  });

  it('createBankAccount$ 409 → mensaje "nombre" + notif.error', async () => {
    api.createBankAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(createBankAccount({ body: { label: 'Galicia' } }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.createBankAccount$);
    expect((action as ReturnType<typeof createBankAccountFailure>).error)
      .toBe('Ya existe una cuenta con ese nombre.');
    expect(notif.error).toHaveBeenCalled();
  });

  it('reloadBankAccountsAfterDeactivate$ re-despacha loadBankAccounts', async () => {
    actions$ = of(deactivateBankAccountSuccess());
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.reloadBankAccountsAfterDeactivate$);
    expect(action).toEqual(loadBankAccounts());
  });
});
