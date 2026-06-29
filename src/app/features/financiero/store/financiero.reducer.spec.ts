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
    const s = financieroReducer(initialState, A.loadOpenSession({ cashRegisterId: 5 }));
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

describe('financiero reducer — subcajas / otros / cuentas', () => {
  it('loadCashRegisters marca registersLoading', () => {
    const s = financieroReducer(initialState, A.loadCashRegisters({ branchId: 3 }));
    expect(s.caja.registersLoading).toBe(true);
    expect(s.caja.error).toBeNull();
  });

  it('loadCashRegistersSuccess guarda el listado y baja loading', () => {
    const registers = [{ id: 5, tenantId: 1, branchId: 3, name: 'Mostrador', active: true }];
    const s = financieroReducer(initialState, A.loadCashRegistersSuccess({ registers }));
    expect(s.caja.registers.length).toBe(1);
    expect(s.caja.registersLoading).toBe(false);
  });

  it('createCashRegisterSuccess agrega la caja al listado', () => {
    const reg = { id: 9, tenantId: 1, branchId: 3, name: 'Extracciones', active: true };
    const s = financieroReducer(initialState, A.createCashRegisterSuccess({ register: reg }));
    expect(s.caja.registers.map(r => r.id)).toEqual([9]);
  });

  it('loadBranchOtherMediaSuccess guarda data y baja loading', () => {
    const data = { rows: [], total: 1500, count: 2 };
    const s = financieroReducer(initialState, A.loadBranchOtherMediaSuccess({ data }));
    expect(s.otros.data?.total).toBe(1500);
    expect(s.otros.loading).toBe(false);
  });

  it('loadBankAccountsSuccess guarda el listado', () => {
    const accounts = [{ id: 1, tenantId: 1, label: 'Galicia', cbu: null, alias: null, banco: null, titular: null, cuit: null, active: true }];
    const s = financieroReducer(initialState, A.loadBankAccountsSuccess({ accounts }));
    expect(s.cuentas.list.length).toBe(1);
    expect(s.cuentas.loading).toBe(false);
  });

  it('createBankAccountSuccess agrega la cuenta y baja saving', () => {
    const acc = { id: 2, tenantId: 1, label: 'Santander', cbu: null, alias: null, banco: null, titular: null, cuit: null, active: true };
    const saving = financieroReducer(initialState, A.createBankAccount({ body: { label: 'Santander' } }));
    expect(saving.cuentas.saving).toBe(true);
    const s = financieroReducer(saving, A.createBankAccountSuccess({ account: acc }));
    expect(s.cuentas.list.map(a => a.id)).toEqual([2]);
    expect(s.cuentas.saving).toBe(false);
  });

  it('updateBankAccountSuccess inactiva → saca la cuenta del listado de activas', () => {
    const acc = { id: 2, tenantId: 1, label: 'Santander', cbu: null, alias: null, banco: null, titular: null, cuit: null, active: true };
    const withAcc = financieroReducer(initialState, A.createBankAccountSuccess({ account: acc }));
    const s = financieroReducer(withAcc, A.updateBankAccountSuccess({ account: { ...acc, active: false } }));
    expect(s.cuentas.list.length).toBe(0);
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

describe('financiero reducer — config fiscal', () => {
  const config = { id: 1, targetTenantId: 2, provider: 'ARCA' as const, invoicePointOfSale: '0001', active: true };

  it('estado inicial tiene config con current null, saving false y error null', () => {
    expect(initialState.config.current).toBeNull();
    expect(initialState.config.saving).toBe(false);
    expect(initialState.config.error).toBeNull();
  });

  it('loadFiscalConfig marca saving false (no cambia) y limpia error', () => {
    const s = financieroReducer(initialState, A.loadFiscalConfig({ tenantId: 2 }));
    expect(s.config.error).toBeNull();
  });

  it('loadFiscalConfigSuccess guarda la config y limpia error', () => {
    const s = financieroReducer(initialState, A.loadFiscalConfigSuccess({ config }));
    expect(s.config.current?.id).toBe(1);
    expect(s.config.current?.provider).toBe('ARCA');
    expect(s.config.error).toBeNull();
  });

  it('loadFiscalConfigFailure guarda el error', () => {
    const s = financieroReducer(initialState, A.loadFiscalConfigFailure({ error: 'Error al cargar config' }));
    expect(s.config.error).toBe('Error al cargar config');
  });

  it('saveFiscalConfig marca saving:true y limpia error', () => {
    const s = financieroReducer(initialState, A.saveFiscalConfig({ body: { targetTenantId: 2, provider: 'ARCA' } }));
    expect(s.config.saving).toBe(true);
    expect(s.config.error).toBeNull();
  });

  it('saveFiscalConfigSuccess guarda config.current y setea saving:false', () => {
    const saving = financieroReducer(initialState, A.saveFiscalConfig({ body: { targetTenantId: 2, provider: 'ARCA' } }));
    const s = financieroReducer(saving, A.saveFiscalConfigSuccess({ config }));
    expect(s.config.current?.id).toBe(1);
    expect(s.config.saving).toBe(false);
    expect(s.config.error).toBeNull();
  });

  it('saveFiscalConfigFailure guarda el error y limpia saving', () => {
    const saving = financieroReducer(initialState, A.saveFiscalConfig({ body: { targetTenantId: 2, provider: 'ARCA' } }));
    const s = financieroReducer(saving, A.saveFiscalConfigFailure({ error: 'Error al guardar' }));
    expect(s.config.saving).toBe(false);
    expect(s.config.error).toBe('Error al guardar');
  });

  it('no muta el slice caja al operar sobre config', () => {
    const s = financieroReducer(initialState, A.loadFiscalConfigSuccess({ config }));
    expect(s.caja).toBe(initialState.caja);
  });

  it('no muta el slice cobros al operar sobre config', () => {
    const s = financieroReducer(initialState, A.loadFiscalConfigSuccess({ config }));
    expect(s.cobros).toBe(initialState.cobros);
  });
});

describe('financiero reducer — cobro (slice registrar pago)', () => {
  it('registerPayment marca submitting y limpia error', () => {
    const s = financieroReducer(initialState, A.registerPayment({ body: {} as any }));
    expect(s.cobro.submitting).toBe(true);
    expect(s.cobro.error).toBeNull();
  });

  it('registerPaymentSuccess guarda result y baja submitting', () => {
    const result = { payment: { id: 1 } as any, fiscalReference: { id: 2 } as any };
    const s = financieroReducer(initialState, A.registerPaymentSuccess({ result }));
    expect(s.cobro.submitting).toBe(false);
    expect(s.cobro.result).toEqual(result);
  });

  it('registerPaymentFailure guarda error y baja submitting', () => {
    const s = financieroReducer(initialState, A.registerPaymentFailure({ error: 'X' }));
    expect(s.cobro.submitting).toBe(false);
    expect(s.cobro.error).toBe('X');
  });

  it('resetCobro vuelve el slice al inicial', () => {
    const dirty = financieroReducer(initialState, A.registerPaymentFailure({ error: 'X' }));
    const s = financieroReducer(dirty, A.resetCobro());
    expect(s.cobro).toEqual(initialState.cobro);
  });
});
