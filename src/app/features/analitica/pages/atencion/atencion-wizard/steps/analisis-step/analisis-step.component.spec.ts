import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { AnalisisStepComponent } from './analisis-step.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NbuService } from '../../../../../services/nbu.service';
import * as A from '../../../../../store/atencion/atencion.actions';

describe('AnalisisStepComponent', () => {
  let fixture: ComponentFixture<AnalisisStepComponent>;
  let dispatched: any[];
  let registry: { isActive: ReturnType<typeof vi.fn> };
  let nbu: { getCurrent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    registry = { isActive: vi.fn().mockReturnValue(false) };
    nbu = { getCurrent: vi.fn().mockReturnValue(of(null)) };
    await TestBed.configureTestingModule({
      imports: [AnalisisStepComponent],
      providers: [
        provideMockStore(),
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

  it('onContinue with Financiero OFF dispatches addAnalysisList + endSecretaryPhase', () => {
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: 1001, name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    expect(dispatched[0].type).toBe(A.addAnalysisList.type);
    expect(dispatched[1].type).toBe(A.endSecretaryPhase.type);
  });

  it('onContinue with Financiero ON dispatches only addAnalysisList and emits stepAdvanced', () => {
    registry.isActive.mockReturnValue(true);
    let stepAdvanced = false;
    fixture.componentInstance.stepAdvanced.subscribe(() => (stepAdvanced = true));
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: 1001, name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    expect(dispatched.find((a) => a.type === A.addAnalysisList.type)).toBeDefined();
    expect(dispatched.find((a) => a.type === A.endSecretaryPhase.type)).toBeUndefined();
    expect(stepAdvanced).toBe(true);
  });

  it('exposes the NBU ubValue when service returns a version', () => {
    nbu.getCurrent.mockReturnValue(of({ id: 1, tenantId: 1, effectiveDate: '2026-05-01', ubValue: 350 }));
    fixture = TestBed.createComponent(AnalisisStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    fixture.detectChanges();
    expect(fixture.componentInstance.ubValue()).toBe(350);
  });
});
