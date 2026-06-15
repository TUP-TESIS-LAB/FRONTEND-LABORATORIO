import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidarProtocoloPage } from './validar-protocolo.page';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving, selectDetalleError } from '../../../store/validacion-detalle/validacion-detalle.selectors';
import { firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
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

function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidarProtocoloPage],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['protocolId', '50015']]) } } },
      provideMockStore({
        selectors: [
          { selector: selectDetalle, value: FIXTURE },
          { selector: selectDetalleLoading, value: false },
          { selector: selectDetalleSaving, value: false },
          { selector: selectDetalleError, value: null },
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
});
