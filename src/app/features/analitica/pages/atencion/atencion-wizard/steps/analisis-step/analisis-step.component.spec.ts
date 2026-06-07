import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject, of } from 'rxjs';
import { AnalisisStepComponent } from './analisis-step.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import * as A from '../../../../../store/atencion/atencion.actions';
import { selectMutating } from '../../../../../store/atencion/atencion.selectors';

const makeRow = (over: Partial<{ id: number; shortCode: string; name: string; isAuthorized: boolean }> = {}) => ({
  id: 5, shortCode: '1001', name: 'X', familyName: null, ubCount: null, isAuthorized: false, ...over,
});

describe('AnalisisStepComponent', () => {
  let fixture: ComponentFixture<AnalisisStepComponent>;
  let dispatched: any[];
  let actions$: ReplaySubject<Action>;
  let registry: { isActive: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    registry = { isActive: vi.fn().mockReturnValue(false) };
    actions$ = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [AnalisisStepComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectMutating, value: false }],
        }),
        provideMockActions(() => actions$),
        { provide: ModuleRegistry, useValue: registry },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalisisStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    fixture.detectChanges();
    dispatched = [];
    (fixture.componentInstance as any)['store'].dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));
  });

  it('onContinue with empty list does NOT dispatch', () => {
    fixture.componentInstance.onContinue();
    expect(dispatched).toHaveLength(0);
  });

  it('onContinue dispatches addAnalysisList immediately', () => {
    fixture.componentInstance.onAnalysisAdded(makeRow());
    fixture.componentInstance.onContinue();
    expect(dispatched[0].type).toBe(A.addAnalysisList.type);
    expect(dispatched.find((a) => a.type === A.endSecretaryPhase.type)).toBeUndefined();
  });

  it('onContinue payload usa items con analysisId e isAuthorized', () => {
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 5, isAuthorized: false }));
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 9, shortCode: '2001', name: 'Glucemia', isAuthorized: true }));
    fixture.componentInstance.onContinue();
    const dispatched0 = dispatched[0];
    expect(dispatched0.payload.items).toEqual([
      { analysisId: 5, isAuthorized: false },
      { analysisId: 9, isAuthorized: true },
    ]);
  });

  it('stepAdvanced emits ONLY after atencionMutationSuccess (pessimistic)', () => {
    let stepAdvanced = false;
    fixture.componentInstance.stepAdvanced.subscribe(() => (stepAdvanced = true));
    fixture.componentInstance.onAnalysisAdded(makeRow());
    fixture.componentInstance.onContinue();
    // Antes del success: no avanza
    expect(stepAdvanced).toBe(false);
    // Llega el success → avanza
    actions$.next(A.atencionMutationSuccess({ item: {} as any }));
    expect(stepAdvanced).toBe(true);
  });

  it('stepAdvanced does NOT emit when mutation fails', () => {
    let stepAdvanced = false;
    fixture.componentInstance.stepAdvanced.subscribe(() => (stepAdvanced = true));
    fixture.componentInstance.onAnalysisAdded(makeRow());
    fixture.componentInstance.onContinue();
    actions$.next(A.atencionMutationFailure({ error: {} as any }));
    expect(stepAdvanced).toBe(false);
  });

  it('onItemsChanged actualiza la lista de items para el dispatch', () => {
    const rows = [makeRow({ id: 3, isAuthorized: true }), makeRow({ id: 4, shortCode: '2001', name: 'Bio', isAuthorized: false })];
    fixture.componentInstance.onItemsChanged(rows);
    fixture.componentInstance.onContinue();
    const dispatched0 = dispatched[0];
    expect(dispatched0.payload.items).toEqual([
      { analysisId: 3, isAuthorized: true },
      { analysisId: 4, isAuthorized: false },
    ]);
  });
});
