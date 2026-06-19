import { describe, expect, it } from 'vitest';
import { financieroReducer, initialState } from './financiero.reducer';
import * as A from './financiero.actions';

const session = { id: 100, status: 'OPEN', openingAmount: 15000, saldoActual: 18680, cashRegisterId: 5 } as any;

describe('financiero reducer — caja', () => {
  it('estado inicial tiene caja con session null y loading false', () => {
    expect(initialState.caja.session).toBeNull();
    expect(initialState.caja.loading).toBe(false);
    expect(initialState.caja.error).toBeNull();
  });

  it('loadOpenSession marca loading', () => {
    const s = financieroReducer(initialState, A.loadOpenSession({ branchId: 5 }));
    expect(s.caja.loading).toBe(true);
    expect(s.caja.error).toBeNull();
  });

  it('loadOpenSessionSuccess guarda la sesión y limpia loading', () => {
    const s = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    expect(s.caja.session?.id).toBe(100);
    expect(s.caja.loading).toBe(false);
    expect(s.caja.error).toBeNull();
  });

  it('sessionNotFound limpia la sesión y activity (caja cerrada)', () => {
    const open = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    const withActivity = financieroReducer(
      open,
      A.loadActivitySuccess({ activity: { rows: [], otrosMediosTotal: 0, cobrosCount: 5 } }),
    );
    const s = financieroReducer(withActivity, A.sessionNotFound());
    expect(s.caja.session).toBeNull();
    expect(s.caja.activity).toBeNull();
    expect(s.caja.loading).toBe(false);
  });

  it('loadOpenSessionFailure guarda el error y limpia loading', () => {
    const s = financieroReducer(
      { ...initialState, caja: { ...initialState.caja, loading: true } },
      A.loadOpenSessionFailure({ error: 'Error de red' }),
    );
    expect(s.caja.loading).toBe(false);
    expect(s.caja.error).toBe('Error de red');
  });

  it('loadActivitySuccess guarda el feed de actividad', () => {
    const activity = { rows: [], otrosMediosTotal: 500, cobrosCount: 3 };
    const s = financieroReducer(initialState, A.loadActivitySuccess({ activity }));
    expect(s.caja.activity?.cobrosCount).toBe(3);
    expect(s.caja.activity?.otrosMediosTotal).toBe(500);
  });

  it('openSessionSuccess guarda la sesión nueva', () => {
    const s = financieroReducer(initialState, A.openSessionSuccess({ session }));
    expect(s.caja.session?.id).toBe(100);
    expect(s.caja.error).toBeNull();
  });

  it('openSessionFailure guarda el error', () => {
    const s = financieroReducer(initialState, A.openSessionFailure({ error: 'Ya hay una caja abierta para esta sucursal.' }));
    expect(s.caja.error).toBe('Ya hay una caja abierta para esta sucursal.');
  });

  it('closeSessionSuccess actualiza la sesión', () => {
    const closed = { ...session, status: 'CLOSED', declaredAmount: 18000 };
    const s = financieroReducer(
      financieroReducer(initialState, A.loadOpenSessionSuccess({ session })),
      A.closeSessionSuccess({ session: closed }),
    );
    expect(s.caja.session?.status).toBe('CLOSED');
  });

  it('closeSessionFailure guarda el error', () => {
    const s = financieroReducer(initialState, A.closeSessionFailure({ error: 'Error al cerrar caja' }));
    expect(s.caja.error).toBe('Error al cerrar caja');
  });

  it('registerTransactionSuccess no muta la sesión pero limpia error', () => {
    const withSession = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    const s = financieroReducer(withSession, A.registerTransactionSuccess());
    expect(s.caja.session?.id).toBe(100);
    expect(s.caja.error).toBeNull();
  });

  it('registerTransactionFailure guarda el error', () => {
    const s = financieroReducer(initialState, A.registerTransactionFailure({ error: 'Error al registrar' }));
    expect(s.caja.error).toBe('Error al registrar');
  });

  it('no muta el slice cobros al operar sobre caja', () => {
    const s = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    expect(s.cobros).toBe(initialState.cobros);
  });

  it('no muta el slice config al operar sobre caja', () => {
    const s = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    expect(s.config).toBe(initialState.config);
  });
});

describe('financiero reducer — cobros', () => {
  it('estado inicial tiene cobros con list vacía, selected null y loading false', () => {
    expect(initialState.cobros.list).toEqual([]);
    expect(initialState.cobros.selected).toBeNull();
    expect(initialState.cobros.loading).toBe(false);
    expect(initialState.cobros.error).toBeNull();
  });

  it('loadPayments marca loading', () => {
    const s = financieroReducer(initialState, A.loadPayments({ branchId: 5 }));
    expect(s.cobros.loading).toBe(true);
    expect(s.cobros.error).toBeNull();
  });

  it('loadPaymentsSuccess guarda la lista y limpia loading', () => {
    const s = financieroReducer(initialState, A.loadPaymentsSuccess({ items: [{ id: 1 } as any] }));
    expect(s.cobros.list.length).toBe(1);
    expect(s.cobros.loading).toBe(false);
    expect(s.cobros.error).toBeNull();
  });

  it('loadPaymentsFailure guarda el error y limpia loading', () => {
    const s = financieroReducer(
      { ...initialState, cobros: { ...initialState.cobros, loading: true } },
      A.loadPaymentsFailure({ error: 'Error de red' }),
    );
    expect(s.cobros.loading).toBe(false);
    expect(s.cobros.error).toBe('Error de red');
  });

  it('loadPayment marca loading', () => {
    const s = financieroReducer(initialState, A.loadPayment({ id: 9 }));
    expect(s.cobros.loading).toBe(true);
    expect(s.cobros.error).toBeNull();
  });

  it('loadPaymentSuccess guarda el pago seleccionado y limpia loading', () => {
    const s = financieroReducer(initialState, A.loadPaymentSuccess({ payment: { id: 9, status: 'PROCESSED' } as any }));
    expect(s.cobros.selected?.id).toBe(9);
    expect(s.cobros.loading).toBe(false);
  });

  it('loadPaymentFailure guarda el error y limpia loading', () => {
    const s = financieroReducer(initialState, A.loadPaymentFailure({ error: 'No encontrado' }));
    expect(s.cobros.loading).toBe(false);
    expect(s.cobros.error).toBe('No encontrado');
  });

  it('cancelPaymentSuccess actualiza el seleccionado a CANCELLED', () => {
    const sel = financieroReducer(initialState, A.loadPaymentSuccess({ payment: { id: 9, status: 'PROCESSED' } as any }));
    const s = financieroReducer(sel, A.cancelPaymentSuccess({ payment: { id: 9, status: 'CANCELLED' } as any }));
    expect(s.cobros.selected?.status).toBe('CANCELLED');
  });

  it('cancelPaymentFailure guarda el error', () => {
    const s = financieroReducer(initialState, A.cancelPaymentFailure({ error: 'No se pudo cancelar' }));
    expect(s.cobros.error).toBe('No se pudo cancelar');
  });

  it('no muta el slice caja al operar sobre cobros', () => {
    const s = financieroReducer(initialState, A.loadPaymentsSuccess({ items: [] }));
    expect(s.caja).toBe(initialState.caja);
  });

  it('no muta el slice config al operar sobre cobros', () => {
    const s = financieroReducer(initialState, A.loadPaymentsSuccess({ items: [] }));
    expect(s.config).toBe(initialState.config);
  });
});
