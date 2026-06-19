import { describe, expect, it } from 'vitest';
import {
  selectCajaSession, selectCajaActivity, selectCajaLoading,
  selectIsCajaOpen, selectCajaSaldo, selectCajaError,
} from './financiero.selectors';
import { initialFinancieroState, FinancieroState } from './financiero.state';

const openSession = {
  id: 100, tenantId: 1, cashRegisterId: 5, openedByUserId: 2,
  openedAt: '2026-06-19T09:00:00Z', closedAt: null, status: 'OPEN' as const,
  openingAmount: 15000, expectedAmount: null, declaredAmount: null,
  difference: null, saldoActual: 18680,
};

const closedSession = { ...openSession, status: 'CLOSED' as const, saldoActual: null };

const activity = { rows: [], otrosMediosTotal: 500, cobrosCount: 3 };

describe('financiero selectors — caja', () => {
  it('selectCajaSession proyecta session del slice caja', () => {
    const state: FinancieroState = {
      ...initialFinancieroState,
      caja: { ...initialFinancieroState.caja, session: openSession },
    };
    expect(selectCajaSession.projector(state.caja)).toEqual(openSession);
  });

  it('selectCajaSession devuelve null cuando no hay sesión', () => {
    expect(selectCajaSession.projector(initialFinancieroState.caja)).toBeNull();
  });

  it('selectCajaActivity proyecta la actividad', () => {
    const caja = { ...initialFinancieroState.caja, activity };
    expect(selectCajaActivity.projector(caja)).toEqual(activity);
  });

  it('selectCajaLoading proyecta loading', () => {
    const caja = { ...initialFinancieroState.caja, loading: true };
    expect(selectCajaLoading.projector(caja)).toBe(true);
  });

  it('selectCajaError proyecta el error', () => {
    const caja = { ...initialFinancieroState.caja, error: 'Ya hay una caja abierta para esta sucursal.' };
    expect(selectCajaError.projector(caja)).toBe('Ya hay una caja abierta para esta sucursal.');
  });

  it('selectIsCajaOpen es true cuando session.status es OPEN', () => {
    expect(selectIsCajaOpen.projector(openSession)).toBe(true);
  });

  it('selectIsCajaOpen es false cuando session está cerrada', () => {
    expect(selectIsCajaOpen.projector(closedSession)).toBe(false);
  });

  it('selectIsCajaOpen es false cuando session es null', () => {
    expect(selectIsCajaOpen.projector(null)).toBe(false);
  });

  it('selectCajaSaldo devuelve saldoActual cuando existe', () => {
    expect(selectCajaSaldo.projector(openSession)).toBe(18680);
  });

  it('selectCajaSaldo cae a openingAmount cuando saldoActual es null', () => {
    const sessionSinSaldo = { ...openSession, saldoActual: null };
    expect(selectCajaSaldo.projector(sessionSinSaldo)).toBe(15000);
  });

  it('selectCajaSaldo devuelve 0 cuando no hay sesión', () => {
    expect(selectCajaSaldo.projector(null)).toBe(0);
  });
});
