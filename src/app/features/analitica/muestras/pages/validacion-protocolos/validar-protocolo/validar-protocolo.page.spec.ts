import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ValidarProtocoloPage } from './validar-protocolo.page';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving } from '../../../store/validacion-detalle/validacion-detalle.selectors';
import { firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
import type { DetalleEstudio } from '../../../models/postanalitica.model';

const FIXTURE: DetalleEstudio = {
  study: {
    protocolId: 50015,
    currentStatus: 'READY_FOR_SIGNATURE',
    expectedResultsCount: 1,
    signedResultsCount: 0,
    patientId: 1,
  },
  results: [
    {
      resultId: 1,
      status: 'VALIDATED',
      sectionId: null,
      determinations: [
        {
          determinationId: 1,
          name: 'Glucosa',
          value: '95',
          unit: 'mg/dL',
          referenceRange: '70-100',
          aggregateOutcome: 'PASS',
          manualOutcome: null,
          outOfRange: false,
        },
        {
          determinationId: 2,
          name: 'Colesterol',
          value: '250',
          unit: 'mg/dL',
          referenceRange: '<200',
          aggregateOutcome: 'WARNING',
          manualOutcome: null,
          outOfRange: true,
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
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: new Map([['protocolId', '50015']]) } },
      },
      provideMockStore({
        selectors: [
          { selector: selectDetalle, value: FIXTURE },
          { selector: selectDetalleLoading, value: false },
          { selector: selectDetalleSaving, value: false },
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
  it('results() returns the one result from the fixture', () => {
    const cmp = setup();
    expect(cmp.results().length).toBe(1);
    expect(cmp.results()[0].resultId).toBe(1);
  });

  it('canSignResult() is true for a VALIDATED result', () => {
    const cmp = setup();
    expect(cmp.canSignResult(cmp.results()[0])).toBe(true);
  });

  it('canSignStudy() is true when study status is READY_FOR_SIGNATURE', () => {
    expect(setup().canSignStudy()).toBe(true);
  });

  it('outOf() is false for in-range determination (Glucosa)', () => {
    const cmp = setup();
    const glucosa = cmp.results()[0].determinations[0];
    expect(cmp.outOf(glucosa)).toBe(false);
  });

  it('outOf() is true for out-of-range determination (Colesterol)', () => {
    const cmp = setup();
    const colesterol = cmp.results()[0].determinations[1];
    expect(cmp.outOf(colesterol)).toBe(true);
  });

  it('firmarEstudio() dispatches action when user confirms', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    cmp.firmarEstudio();
    expect(dispatch).toHaveBeenCalledWith(firmarEstudio({ protocolId: 50015 }));
  });

  it('firmarEstudio() does NOT dispatch when user cancels', () => {
    const cmp = setup();
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    cmp.firmarEstudio();
    expect(dispatch).not.toHaveBeenCalledWith(firmarEstudio({ protocolId: 50015 }));
  });
});
