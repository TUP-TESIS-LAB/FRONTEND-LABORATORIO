import { describe, it, expect } from 'vitest';
import { isDownloadBlockedByPendingEmission, isPendingEmission } from './cobro-detalle.page';

/**
 * `CobroDetallePage` es una smart page que mezcla Store, Router,
 * ActivatedRoute, PollingService y DestroyRef — montarla completa en Vitest
 * agrega mocking desproporcionado para lo que hay que probar acá. La lógica
 * de decisión (cuándo pollear, cuándo bloquear la descarga) está extraída
 * como funciones puras — eso es lo que se testea.
 */
describe('isPendingEmission', () => {
  it('true solo con PENDING', () => {
    expect(isPendingEmission('PENDING')).toBe(true);
  });

  it('false con EMITTED, FAILED o null (comprobante no electrónico)', () => {
    expect(isPendingEmission('EMITTED')).toBe(false);
    expect(isPendingEmission('FAILED')).toBe(false);
    expect(isPendingEmission(null)).toBe(false);
  });
});

describe('isDownloadBlockedByPendingEmission', () => {
  it('bloquea la descarga cuando está PENDING y el pago sigue activo', () => {
    expect(isDownloadBlockedByPendingEmission('PENDING', 'PROCESSED')).toBe(true);
  });

  it('no bloquea cuando el pago fue CANCELLED, aunque haya quedado PENDING (KAN-242)', () => {
    expect(isDownloadBlockedByPendingEmission('PENDING', 'CANCELLED')).toBe(false);
  });

  it('no bloquea con EMITTED', () => {
    expect(isDownloadBlockedByPendingEmission('EMITTED', 'PROCESSED')).toBe(false);
  });

  it('no bloquea con FAILED', () => {
    expect(isDownloadBlockedByPendingEmission('FAILED', 'PROCESSED')).toBe(false);
  });

  it('no bloquea con comprobantes no electrónicos (sin emissionStatus)', () => {
    expect(isDownloadBlockedByPendingEmission(null, 'PROCESSED')).toBe(false);
  });
});
