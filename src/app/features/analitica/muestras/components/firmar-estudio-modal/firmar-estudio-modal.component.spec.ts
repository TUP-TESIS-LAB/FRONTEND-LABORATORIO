import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirmarEstudioModalComponent } from './firmar-estudio-modal.component';
import type { DetalleResultado } from '../../models/postanalitica.model';

function res(over: Partial<DetalleResultado>): DetalleResultado {
  return {
    resultId: 1, status: 'PENDING', sectionId: null,
    analysisName: 'Análisis', analysisFamily: null, determinations: [],
    ...over,
  };
}

/**
 * NOTA: en este entorno `setInput` sobre signal inputs falla por una limitación de infra
 * JIT (NG0303/NG0950), documentada en planilla-grid.component.spec. Por eso construimos el
 * componente en contexto de inyección y reemplazamos el signal input `results` por un signal
 * de prueba, igual que el patrón stateless del proyecto.
 */
function make(results: DetalleResultado[]): FirmarEstudioModalComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [FirmarEstudioModalComponent] });
  const cmp = TestBed.runInInjectionContext(() => new FirmarEstudioModalComponent());
  (cmp as unknown as { results: () => DetalleResultado[] }).results = signal(results);
  return cmp;
}

describe('FirmarEstudioModalComponent', () => {
  it('esTotal true cuando todos los NO-pendientes están validados y no hay pendientes', () => {
    const c = make([res({ resultId: 1, status: 'VALIDATED' }), res({ resultId: 2, status: 'SIGNED' })]);
    expect(c.hayPendientes()).toBe(false);
    expect(c.esTotal()).toBe(true);
  });

  it('esTotal false cuando hay un pendiente, aunque el resto esté validado (firma parcial)', () => {
    const c = make([
      res({ resultId: 1, status: 'VALIDATED' }),
      res({ resultId: 0, status: 'PENDING', analysisName: 'Hemograma', pending: true }),
    ]);
    expect(c.hayPendientes()).toBe(true);
    expect(c.esTotal()).toBe(false);
  });

  it('firmablesCount NO cuenta los pendientes', () => {
    const c = make([
      res({ resultId: 1, status: 'VALIDATED' }),
      res({ resultId: 0, status: 'VALIDATED', pending: true }), // pendiente no debe contar
    ]);
    expect(c.firmablesCount()).toBe(1);
  });

  it('esFirmable(pendiente) es siempre false', () => {
    const c = make([res({ resultId: 1, status: 'VALIDATED' })]);
    expect(c.esFirmable(res({ status: 'VALIDATED', pending: true }))).toBe(false);
    expect(c.esFirmable(res({ status: 'SIGNED', pending: true }))).toBe(false);
  });

  it('esFirmable(no-pendiente VALIDATED/SIGNED) true (no regresión)', () => {
    const c = make([res({ resultId: 1, status: 'VALIDATED' })]);
    expect(c.esFirmable(res({ status: 'VALIDATED' }))).toBe(true);
    expect(c.esFirmable(res({ status: 'SIGNED' }))).toBe(true);
    expect(c.esFirmable(res({ status: 'PENDING' }))).toBe(false);
  });

  it('etiqueta(pendiente) = "Sin resultado"', () => {
    const c = make([res({ resultId: 1, status: 'VALIDATED' })]);
    expect(c.etiqueta(res({ pending: true }))).toBe('Sin resultado');
  });

  it('con pendientes esTotal es false → el botón del template muestra "Firmar parcial"', () => {
    // El label se deriva de esTotal(): esTotal ? "Firmar y cerrar" : "Firmar parcial".
    const c = make([
      res({ resultId: 1, status: 'VALIDATED' }),
      res({ resultId: 0, status: 'PENDING', pending: true }),
    ]);
    expect(c.esTotal()).toBe(false);
  });

  it('degradación suave: sin pendientes (pending undefined) → esTotal con validados (no regresión)', () => {
    const c = make([res({ resultId: 1, status: 'VALIDATED', pending: undefined })]);
    expect(c.hayPendientes()).toBe(false);
    expect(c.esTotal()).toBe(true);
  });
});
