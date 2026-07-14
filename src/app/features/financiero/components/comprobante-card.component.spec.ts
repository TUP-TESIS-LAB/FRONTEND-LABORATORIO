import { describe, it, expect } from 'vitest';
import { comprobanteDisplayState, FiscalInvoiceReference } from '../models/financiero.model';

/**
 * El estado visible del card se testea sobre `comprobanteDisplayState`, no vía TestBed:
 * `componentRef.setInput()` no llega a los signal inputs bajo el Vitest de este repo
 * (falla con NG0303 y la lectura posterior revienta con NG0950). Es deuda del test infra,
 * ajena a este cambio — mismo motivo que en KAN-242.
 */
describe('comprobanteDisplayState', () => {
  const ref = (over: Partial<FiscalInvoiceReference> = {}): FiscalInvoiceReference => ({
    id: 1, paymentId: 9, provider: 'ARCA', comprobanteTipo: 'FACTURA_B',
    internalReference: null, externalInvoiceId: null, electronic: true,
    isVoid: false, emittedAt: '2026-07-14T10:00:00Z',
    ...over,
  });

  it('sin referencia fiscal → NONE', () => {
    expect(comprobanteDisplayState(null)).toBe('NONE');
    expect(comprobanteDisplayState(undefined)).toBe('NONE');
  });

  it('electrónico recién cobrado (PENDING) → PENDING: el CAE todavía no llegó', () => {
    expect(comprobanteDisplayState(ref({ emissionStatus: 'PENDING', cae: null }))).toBe('PENDING');
  });

  it('electrónico con CAE resuelto (EMITTED) → READY', () => {
    expect(comprobanteDisplayState(ref({ emissionStatus: 'EMITTED', cae: '75123456789012' }))).toBe('READY');
  });

  it('emisión fallida (FAILED) → FAILED', () => {
    expect(comprobanteDisplayState(ref({ emissionStatus: 'FAILED' }))).toBe('FAILED');
  });

  it('no electrónico (Factura X, sin emissionStatus) → READY: nunca pasa por el flujo de ARCA', () => {
    const facturaX = ref({ comprobanteTipo: 'FACTURA_X', electronic: false, provider: 'NONE' });
    delete facturaX.emissionStatus;
    expect(comprobanteDisplayState(facturaX)).toBe('READY');
  });

  it('Factura X anulada sigue READY: se descarga con watermark ANULADO (regresión KAN-242)', () => {
    const anulada = ref({ comprobanteTipo: 'FACTURA_X', electronic: false, isVoid: true, provider: 'NONE' });
    delete anulada.emissionStatus;
    expect(comprobanteDisplayState(anulada)).toBe('READY');
  });
});
