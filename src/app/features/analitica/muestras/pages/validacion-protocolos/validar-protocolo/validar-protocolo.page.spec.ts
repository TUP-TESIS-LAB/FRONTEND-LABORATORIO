import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidarProtocoloPage } from './validar-protocolo.page';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving, selectDetallePdfLoading } from '../../../store/validacion-detalle/validacion-detalle.selectors';
import { firmarEstudio, verPdf } from '../../../store/validacion-detalle/validacion-detalle.actions';
import type { DetalleEstudio } from '../../../models/postanalitica.model';

const FIXTURE: DetalleEstudio = {
  study: {
    protocolId: 50015,
    currentStatus: 'READY_FOR_SIGNATURE',
    expectedResultsCount: 1,
    signedResultsCount: 0,
    patientId: 1,
    patientName: 'García, Carlos',
    patientSex: 'M',
    patientBirthDate: '1970-01-01',
  },
  results: [
    {
      resultId: 1,
      status: 'VALIDATED',
      sectionId: null,
      analysisName: 'Hemograma',
      analysisFamily: 'Hematología',
      determinations: [
        {
          determinationId: 1, name: 'Glucosa', value: '95', unit: 'mg/dL',
          referenceRange: '70-100', aggregateOutcome: 'PASS', manualOutcome: null, outOfRange: false,
        },
        {
          determinationId: 2, name: 'Colesterol', value: '250', unit: 'mg/dL',
          referenceRange: '<200', aggregateOutcome: 'WARNING', manualOutcome: null, outOfRange: true,
        },
      ],
    },
  ],
};

const SMOKE_TEMPLATE = `<span></span>`;

function setup(detalle: DetalleEstudio = FIXTURE) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidarProtocoloPage],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['protocolId', '50015']]) } } },
      provideMockStore({
        selectors: [
          { selector: selectDetalle, value: detalle },
          { selector: selectDetalleLoading, value: false },
          { selector: selectDetalleSaving, value: false },
          { selector: selectDetallePdfLoading, value: false },
        ],
      }),
    ],
  });
  TestBed.overrideTemplate(ValidarProtocoloPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidarProtocoloPage);
  fx.detectChanges();
  return fx.componentInstance;
}

describe('ValidarProtocoloPage (smoke)', () => {
  it('results() devuelve el resultado del fixture', () => {
    const cmp = setup();
    expect(cmp.results().length).toBe(1);
    expect(cmp.results()[0].resultId).toBe(1);
  });

  it('nombreAnalisis() usa analysisName del backend (GAP-4)', () => {
    const cmp = setup();
    expect(cmp.nombreAnalisis(cmp.results()[0])).toBe('Hemograma');
  });

  it('patientName/edad se toman del header del backend (GAP-4)', () => {
    const cmp = setup();
    expect(cmp.patientName()).toBe('García, Carlos');
    expect(cmp.edad()).toBeGreaterThan(0);
  });

  it('canValidate() es false para un resultado ya VALIDATED', () => {
    const cmp = setup();
    expect(cmp.canValidate(cmp.results()[0])).toBe(false);
  });

  it('canOpenFirmaModal() es true: estudio no cerrado con un resultado validado', () => {
    expect(setup().canOpenFirmaModal()).toBe(true);
  });

  it('outOf() refleja outOfRange de la determinación', () => {
    const cmp = setup();
    expect(cmp.outOf(cmp.results()[0].determinations[0])).toBe(false);
    expect(cmp.outOf(cmp.results()[0].determinations[1])).toBe(true);
  });

  it('abrirFirmaModal() abre el modal; confirmarFirma() lo cierra y despacha firmarEstudio', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.abrirFirmaModal();
    expect(cmp.firmarModalOpen()).toBe(true);
    cmp.confirmarFirma();
    expect(cmp.firmarModalOpen()).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(firmarEstudio({ protocolId: 50015 }));
  });

  it('cerrarFirmaModal() cierra sin despachar firma', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.abrirFirmaModal();
    cmp.cerrarFirmaModal();
    expect(cmp.firmarModalOpen()).toBe(false);
    expect(dispatch).not.toHaveBeenCalledWith(firmarEstudio({ protocolId: 50015 }));
  });

  // --- Ver PDF (botón bajo demanda, visible solo si el estudio está firmado) ---

  it('estaFirmado(): false para un estudio no firmado (READY_FOR_SIGNATURE)', () => {
    expect(setup().estaFirmado()).toBe(false);
  });

  it('estaFirmado(): true para PARTIALLY_SIGNED y CLOSED', () => {
    const parcial = { ...FIXTURE, study: { ...FIXTURE.study, currentStatus: 'PARTIALLY_SIGNED' as const } };
    const cerrado = { ...FIXTURE, study: { ...FIXTURE.study, currentStatus: 'CLOSED' as const } };
    expect(setup(parcial).estaFirmado()).toBe(true);
    expect(setup(cerrado).estaFirmado()).toBe(true);
  });

  it('verPdf(): despacha verPdf cuando el estudio está firmado', () => {
    const cerrado = { ...FIXTURE, study: { ...FIXTURE.study, currentStatus: 'CLOSED' as const } };
    const cmp = setup(cerrado);
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.verPdf();
    expect(dispatch).toHaveBeenCalledWith(verPdf({ protocolId: 50015 }));
  });

  it('verPdf(): no despacha si el estudio no está firmado', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.verPdf();
    expect(dispatch).not.toHaveBeenCalledWith(verPdf({ protocolId: 50015 }));
  });

  // --- Parte 2: gate de validación por completitud del resultado ---

  function makeResult(over: Partial<DetalleEstudio['results'][number]>): DetalleEstudio['results'][number] {
    return {
      resultId: 9, status: 'PENDING', sectionId: null,
      analysisName: 'Hemograma', analysisFamily: 'Hematología', determinations: [],
      ...over,
    };
  }

  it('esCompleto(): true cuando isComplete es true', () => {
    const cmp = setup();
    expect(cmp.esCompleto(makeResult({ isComplete: true }))).toBe(true);
  });

  it('esCompleto(): false cuando isComplete es false (resultado incompleto)', () => {
    const cmp = setup();
    expect(cmp.esCompleto(makeResult({ isComplete: false }))).toBe(false);
  });

  it('esCompleto(): degradación suave — undefined se trata como completo (back viejo)', () => {
    const cmp = setup();
    expect(cmp.esCompleto(makeResult({ isComplete: undefined }))).toBe(true);
  });

  it('canValidate(): false para un resultado incompleto aunque esté en estado validable', () => {
    const cmp = setup();
    const incompleto = makeResult({ status: 'PENDING', isComplete: false });
    expect(cmp.esValidable(incompleto)).toBe(true);
    expect(cmp.canValidate(incompleto)).toBe(false);
  });

  it('canValidate(): true para un resultado completo en estado validable', () => {
    const cmp = setup();
    expect(cmp.canValidate(makeResult({ status: 'PENDING', isComplete: true }))).toBe(true);
  });

  it('validar(): no despacha validarTodo si el resultado está incompleto', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.validar(makeResult({ status: 'PENDING', isComplete: false }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  // --- Análisis PENDIENTES (sin resultado todavía) ---

  it('canEdit/esValidable/canValidate: todas false para un pendiente (acciones deshabilitadas)', () => {
    const cmp = setup();
    const pendiente = makeResult({ status: 'PENDING', pending: true });
    expect(cmp.canEdit(pendiente)).toBe(false);
    expect(cmp.esValidable(pendiente)).toBe(false);
    expect(cmp.canValidate(pendiente)).toBe(false);
  });

  it('validar(): no despacha nada para un pendiente', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    cmp.validar(makeResult({ status: 'PENDING', pending: true }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('badgeAnalisis(): estado neutro "Pendiente" para un pendiente; normal para el resto', () => {
    const cmp = setup();
    expect(cmp.badgeAnalisis(makeResult({ pending: true }))[1]).toBe('Pendiente');
    expect(cmp.badgeAnalisis(makeResult({ status: 'VALIDATED' }))[1]).toBe('Validado');
  });

  it('rowKey(): los pendientes (sin resultId real) generan claves distintas', () => {
    const cmp = setup();
    const p1 = makeResult({ resultId: 0, analysisName: 'Hemograma', pending: true });
    const p2 = makeResult({ resultId: 0, analysisName: 'Orina', pending: true });
    expect(cmp.rowKey(p1, 0)).not.toBe(cmp.rowKey(p2, 1));
  });

  it('esPendiente: degradación suave — undefined se trata como NO pendiente', () => {
    const cmp = setup();
    expect(cmp.esPendiente(makeResult({ pending: undefined }))).toBe(false);
    expect(cmp.esValidable(makeResult({ status: 'PENDING', pending: undefined, isComplete: true }))).toBe(true);
  });

  // --- UI-6: traducción de sexo y outcomes al español ---

  it('sexoLabel(): traduce los códigos crudos del back a español', () => {
    const cmp = setup();
    expect(cmp.sexoLabel('MALE')).toBe('Masculino');
    expect(cmp.sexoLabel('FEMALE')).toBe('Femenino');
    expect(cmp.sexoLabel('INTERSEX')).toBe('Intersex');
  });

  it('sexoLabel(): valor crudo/vacío para null u otros (no rompe)', () => {
    const cmp = setup();
    expect(cmp.sexoLabel(null)).toBe('');
    expect(cmp.sexoLabel('OTRO')).toBe('OTRO');
  });

  it('outcomeLabel(): traduce los ValidationOutcome a español', () => {
    const cmp = setup();
    expect(cmp.outcomeLabel('PASS')).toBe('Correcto');
    expect(cmp.outcomeLabel('WARNING')).toBe('Advertencia');
    expect(cmp.outcomeLabel('FAIL')).toBe('Fuera de rango');
    expect(cmp.outcomeLabel(null)).toBe('');
  });
});
