import { describe, expect, it } from 'vitest';
import {
  selectCajaSession, selectCajaActivity, selectCajaLoading,
  selectIsCajaOpen, selectCajaSaldo, selectCajaError,
  selectCobrosList, selectCobrosLoading, selectCobrosError, selectCobroSelected,
  selectCobroSubmitting, selectCobroResult, selectCobroError,
  selectFiscalConfig, selectFiscalSaving, selectFiscalConfigError,
} from './financiero.selectors';
import { initialFinancieroState, FinancieroState, FINANCIERO_FEATURE_KEY } from './financiero.state';

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

describe('financiero selectors — cobros', () => {
  const payment = { id: 9, status: 'PROCESSED', totalAmount: 5000 } as any;
  const list = [payment, { id: 10, status: 'CANCELLED', totalAmount: 2000 } as any];

  it('selectCobrosList proyecta la lista de pagos', () => {
    const cobros = { ...initialFinancieroState.cobros, list };
    expect(selectCobrosList.projector(cobros)).toEqual(list);
  });

  it('selectCobrosList devuelve array vacío en estado inicial', () => {
    expect(selectCobrosList.projector(initialFinancieroState.cobros)).toEqual([]);
  });

  it('selectCobrosLoading proyecta loading', () => {
    const cobros = { ...initialFinancieroState.cobros, loading: true };
    expect(selectCobrosLoading.projector(cobros)).toBe(true);
  });

  it('selectCobrosError proyecta el error', () => {
    const cobros = { ...initialFinancieroState.cobros, error: 'Error de carga' };
    expect(selectCobrosError.projector(cobros)).toBe('Error de carga');
  });

  it('selectCobroSelected proyecta el pago seleccionado', () => {
    const cobros = { ...initialFinancieroState.cobros, selected: payment };
    expect(selectCobroSelected.projector(cobros)).toEqual(payment);
  });

  it('selectCobroSelected devuelve null en estado inicial', () => {
    expect(selectCobroSelected.projector(initialFinancieroState.cobros)).toBeNull();
  });
});

describe('financiero selectors — cobro (slice registrar pago)', () => {
  it('selectCobroSubmitting / Result / Error leen el slice cobro', () => {
    const state: any = { [FINANCIERO_FEATURE_KEY]: { ...initialFinancieroState,
      cobro: { submitting: true, result: { payment: { id: 9 } } as any, error: 'E' } } };
    expect(selectCobroSubmitting.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toBe(true);
    expect(selectCobroResult.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toEqual({ payment: { id: 9 } });
    expect(selectCobroError.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toBe('E');
  });
});

describe('financiero selectors — config fiscal', () => {
  const config = { id: 1, targetTenantId: 2, provider: 'ARCA' as const, invoicePointOfSale: '0001', active: true };

  it('selectFiscalConfig proyecta la config fiscal', () => {
    const configSlice = { ...initialFinancieroState.config, current: config };
    expect(selectFiscalConfig.projector(configSlice)).toEqual(config);
  });

  it('selectFiscalConfig devuelve null en estado inicial', () => {
    expect(selectFiscalConfig.projector(initialFinancieroState.config)).toBeNull();
  });

  it('selectFiscalSaving proyecta saving', () => {
    const configSlice = { ...initialFinancieroState.config, saving: true };
    expect(selectFiscalSaving.projector(configSlice)).toBe(true);
  });

  it('selectFiscalSaving es false en estado inicial', () => {
    expect(selectFiscalSaving.projector(initialFinancieroState.config)).toBe(false);
  });

  it('selectFiscalConfigError proyecta el error', () => {
    const configSlice = { ...initialFinancieroState.config, error: 'Error de carga' };
    expect(selectFiscalConfigError.projector(configSlice)).toBe('Error de carga');
  });

  it('selectFiscalConfigError es null en estado inicial', () => {
    expect(selectFiscalConfigError.projector(initialFinancieroState.config)).toBeNull();
  });
});
