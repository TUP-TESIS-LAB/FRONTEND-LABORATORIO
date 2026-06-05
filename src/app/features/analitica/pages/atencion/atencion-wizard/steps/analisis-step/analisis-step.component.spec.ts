import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject, of } from 'rxjs';
import { AnalisisStepComponent } from './analisis-step.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NbuService } from '../../../../../services/nbu.service';
import * as A from '../../../../../store/atencion/atencion.actions';
import { selectMutating } from '../../../../../store/atencion/atencion.selectors';

describe('AnalisisStepComponent', () => {
  let fixture: ComponentFixture<AnalisisStepComponent>;
  let dispatched: any[];
  let actions$: ReplaySubject<Action>;
  let registry: { isActive: ReturnType<typeof vi.fn> };
  let nbu: { getCurrent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    registry = { isActive: vi.fn().mockReturnValue(false) };
    nbu = { getCurrent: vi.fn().mockReturnValue(of(null)) };
    actions$ = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [AnalisisStepComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectMutating, value: false }],
        }),
        provideMockActions(() => actions$),
        { provide: ModuleRegistry, useValue: registry },
        { provide: NbuService, useValue: nbu },
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
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: '1001', name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    expect(dispatched[0].type).toBe(A.addAnalysisList.type);
    expect(dispatched.find((a) => a.type === A.endSecretaryPhase.type)).toBeUndefined();
  });

  it('stepAdvanced emits ONLY after atencionMutationSuccess (pessimistic)', () => {
    let stepAdvanced = false;
    fixture.componentInstance.stepAdvanced.subscribe(() => (stepAdvanced = true));
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: '1001', name: 'X', familyName: null, ubCount: null });
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
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: '1001', name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    actions$.next(A.atencionMutationFailure({ error: {} as any }));
    expect(stepAdvanced).toBe(false);
  });

  it('exposes the NBU ubValue when service returns a version', () => {
    nbu.getCurrent.mockReturnValue(of({ id: 1, tenantId: 1, effectiveDate: '2026-05-01', ubValue: 350 }));
    fixture = TestBed.createComponent(AnalisisStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    fixture.detectChanges();
    expect(fixture.componentInstance.ubValue()).toBe(350);
  });
});
