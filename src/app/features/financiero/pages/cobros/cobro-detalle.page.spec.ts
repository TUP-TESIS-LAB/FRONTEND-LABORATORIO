import { describe, it, expect } from 'vitest';
import {
  isDownloadBlockedByPendingEmission,
  isPendingEmission,
  shouldPollEmission,
  hasReachedEmissionPollCap,
  EMISSION_POLL_MAX_ATTEMPTS,
} from './cobro-detalle.page';

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

/**
 * Regresión del hallazgo #3 de la review (Pertusati): `isPendingEmission` sola no alcanza para
 * decidir si hay que seguir polleando — un pago CANCELLED puede quedar con `emissionStatus`
 * PENDING para siempre (nunca se termina de emitir un comprobante de un pago anulado), y el
 * polling anterior no tenía forma de frenar ese caso.
 */
describe('shouldPollEmission', () => {
  it('pollea con PENDING y el pago activo', () => {
    expect(shouldPollEmission('PENDING', 'PROCESSED')).toBe(true);
    expect(shouldPollEmission('PENDING', 'CREATED')).toBe(true);
  });

  it('NO pollea si el pago fue CANCELLED, aunque emissionStatus siga PENDING (KAN-242)', () => {
    expect(shouldPollEmission('PENDING', 'CANCELLED')).toBe(false);
  });

  it('no pollea en estados terminales de emisión', () => {
    expect(shouldPollEmission('EMITTED', 'PROCESSED')).toBe(false);
    expect(shouldPollEmission('FAILED', 'PROCESSED')).toBe(false);
    expect(shouldPollEmission(null, 'PROCESSED')).toBe(false);
  });
});

/**
 * Regresión del hallazgo #3, segunda parte: el polling no tenía tope de intentos — sin la
 * transición a CANCELLED, un pago que nunca resuelve la emisión pollearía indefinidamente.
 */
describe('hasReachedEmissionPollCap', () => {
  it('no llegó al tope todavía', () => {
    expect(hasReachedEmissionPollCap(1)).toBe(false);
    expect(hasReachedEmissionPollCap(EMISSION_POLL_MAX_ATTEMPTS - 1)).toBe(false);
  });

  it('frena exactamente al llegar al tope', () => {
    expect(hasReachedEmissionPollCap(EMISSION_POLL_MAX_ATTEMPTS)).toBe(true);
  });

  it('frena si ya lo superó', () => {
    expect(hasReachedEmissionPollCap(EMISSION_POLL_MAX_ATTEMPTS + 5)).toBe(true);
  });

  it('acepta un tope custom', () => {
    expect(hasReachedEmissionPollCap(3, 3)).toBe(true);
    expect(hasReachedEmissionPollCap(2, 3)).toBe(false);
  });
});
