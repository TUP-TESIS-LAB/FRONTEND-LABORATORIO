import { METHOD_META, PaymentMethod } from './financiero.model';

describe('financiero metadata', () => {
  it('marca solo CASH como efectivo arqueable', () => {
    expect(METHOD_META['CASH'].esEfectivo).toBe(true);
    (['QR','POSNET','TRANSFER','CREDIT_CARD','DEBIT_CARD'] as PaymentMethod[])
      .forEach(m => expect(METHOD_META[m].esEfectivo).toBe(false));
  });
  it('tiene label e icono por método', () => {
    expect(METHOD_META['CASH'].label).toBe('Efectivo');
    expect(METHOD_META['CASH'].icon).toBe('pi-money-bill');
  });
});
