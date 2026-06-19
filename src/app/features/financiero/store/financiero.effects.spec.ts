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
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivity, loadActivitySuccess, loadActivityNotModified, loadActivityFailure,
  openSession, openSessionSuccess, openSessionFailure,
  closeSession, closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
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
  let api: {
    getOpenSession: ReturnType<typeof vi.fn>;
    getActivity: ReturnType<typeof vi.fn>;
    openSession: ReturnType<typeof vi.fn>;
    closeSession: ReturnType<typeof vi.fn>;
    registerTransaction: ReturnType<typeof vi.fn>;
  };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      getOpenSession: vi.fn(),
      getActivity: vi.fn(),
      openSession: vi.fn(),
      closeSession: vi.fn(),
      registerTransaction: vi.fn(),
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
    actions$ = of(loadOpenSession({ branchId: 5 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadOpenSession$);
    expect(api.getOpenSession).toHaveBeenCalledWith(5);
    expect(action).toEqual(loadOpenSessionSuccess({ session: openCashSession }));
  });

  it('loadOpenSession$ emite sessionNotFound cuando el backend devuelve null', async () => {
    api.getOpenSession.mockReturnValue(of(null));
    actions$ = of(loadOpenSession({ branchId: 5 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.loadOpenSession$);
    expect(action).toEqual(sessionNotFound());
  });

  it('loadOpenSession$ mapea errores a loadOpenSessionFailure', async () => {
    api.getOpenSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadOpenSession({ branchId: 5 }));
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
    actions$ = of(openSession({ branchId: 5, openingAmount: 15000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect(api.openSession).toHaveBeenCalledWith(5, 15000);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(openSessionSuccess({ session: openCashSession }));
  });

  it('openSession$ ante 409 mapea el mensaje en español', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    actions$ = of(openSession({ branchId: 5, openingAmount: 1000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect((action as ReturnType<typeof openSessionFailure>).error).toBe('Ya hay una caja abierta para esta sucursal.');
    expect(notif.error).toHaveBeenCalledWith('Ya hay una caja abierta para esta sucursal.');
  });

  it('openSession$ ante 422 mapea el mensaje correcto', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    actions$ = of(openSession({ branchId: 5, openingAmount: 1000 }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.openSession$);
    expect((action as ReturnType<typeof openSessionFailure>).error).toBe('No se puede cobrar: no hay una caja abierta.');
    expect(notif.error).toHaveBeenCalledWith('No se puede cobrar: no hay una caja abierta.');
  });

  it('openSession$ ante 500 muestra mensaje genérico', async () => {
    api.openSession.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(openSession({ branchId: 5, openingAmount: 1000 }));
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
    const body = { branchId: 5, type: 'INGRESS' as const, amount: 500, description: 'Caja chica' };
    actions$ = of(registerTransaction({ id: 100, body }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerTransaction$);
    expect(api.registerTransaction).toHaveBeenCalledWith(100, body);
    expect(notif.success).toHaveBeenCalled();
    expect(action).toEqual(registerTransactionSuccess());
  });

  it('registerTransaction$ ante error emite registerTransactionFailure', async () => {
    api.registerTransaction.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(registerTransaction({ id: 100, body: { branchId: 5, type: 'EGRESS' as const, amount: 100, description: 'Retiro' } }));
    const effects = TestBed.inject(FinancieroEffects);
    const action = await firstValueFrom(effects.registerTransaction$);
    expect(action.type).toBe('[Financiero Caja API] Register Transaction Failure');
    expect(notif.error).toHaveBeenCalled();
  });
});
