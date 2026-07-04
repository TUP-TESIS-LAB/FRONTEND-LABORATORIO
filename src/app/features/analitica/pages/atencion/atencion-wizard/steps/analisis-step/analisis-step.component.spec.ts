import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ReplaySubject, of } from 'rxjs';
import { AnalisisStepComponent } from './analisis-step.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { clearAnalisisDraft, writeAnalisisDraft } from '../../../../../utils/analisis-draft-store';
import * as A from '../../../../../store/atencion/atencion.actions';
import { selectMutating } from '../../../../../store/atencion/atencion.selectors';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../../../store/atencion/atencion.state';

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
          initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState },
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

  /** Setea el plan de la atención en el store para controlar `isParticular` (null ⇒ Particular). */
  function setDetailInsurancePlan(insurancePlanId: number | null): void {
    const store = (fixture.componentInstance as any)['store'];
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        detail: { id: 42, insurancePlanId, isUrgent: false, analysisAuthorizations: [] } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
  }

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

  it('onContinue payload usa items con analysisId e isAuthorized (obra social)', () => {
    setDetailInsurancePlan(7); // obra social ⇒ se respeta el isAuthorized por fila
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 5, isAuthorized: false }));
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 9, shortCode: '2001', name: 'Glucemia', isAuthorized: true }));
    fixture.componentInstance.onContinue();
    const dispatched0 = dispatched[0];
    expect(dispatched0.payload.items).toEqual([
      { analysisId: 5, isAuthorized: false },
      { analysisId: 9, isAuthorized: true },
    ]);
  });

  it('item 3: con cobertura Particular el payload fuerza isAuthorized=false en todas las filas', () => {
    setDetailInsurancePlan(null); // Particular
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 5, isAuthorized: true }));
    fixture.componentInstance.onAnalysisAdded(makeRow({ id: 9, shortCode: '2001', name: 'Glucemia', isAuthorized: true }));
    fixture.componentInstance.onContinue();
    expect(dispatched[0].payload.items).toEqual([
      { analysisId: 5, isAuthorized: false },
      { analysisId: 9, isAuthorized: false },
    ]);
  });

  it('item 6: con 0 análisis muestra el empty state "Ingrese análisis para continuar"', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ingrese análisis para continuar');
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

  // El footer "Volver fase" se movió al contenedor (ui-wizard-shell): el step ya no
  // lo renderiza ni expone returnPhase. La navegación se prueba en el wizard.

  it('emite itemsCount con la cantidad de análisis cargados', () => {
    const counts: number[] = [];
    fixture.componentInstance.itemsCount.subscribe((n) => counts.push(n));
    fixture.componentInstance.onAnalysisAdded({ id: 1, isAuthorized: true } as any);
    fixture.detectChanges();
    expect(counts.at(-1)).toBe(1);
  });

  it('al retomar: dispatcha loadAttentionAnalyses, hidrata isUrgent y arma initialItems con isAuthorized (003)', () => {
    const store = (fixture.componentInstance as any)['store'];
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        detail: {
          id: 42, isUrgent: true,
          analysisAuthorizations: [
            { id: 1, analysisId: 3, isAuthorized: true, active: true },
            { id: 2, analysisId: 9, isAuthorized: false, active: true },
          ],
        } as any,
        summaryAnalyses: [
          { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null },
          { id: 9, shortCode: '2001', name: 'Glucemia', familyName: null, ubCount: null },
        ] as any,
      },
    });
    store.refreshState();
    // beforeEach reemplazó store.dispatch por un push a `dispatched`; lo reseteamos.
    dispatched = [];
    store.dispatch = vi.fn().mockImplementation((x: any) => dispatched.push(x));

    const f = TestBed.createComponent(AnalisisStepComponent);
    f.componentRef.setInput('atencionId', 42);
    f.detectChanges();

    expect(dispatched).toContainEqual(A.loadAttentionAnalyses({ analysisIds: [3, 9] }));
    expect(f.componentInstance.isUrgentValue).toBe(true);
    expect(f.componentInstance.initialItems()).toEqual([
      { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true },
      { id: 9, shortCode: '2001', name: 'Glucemia', familyName: null, ubCount: null, isAuthorized: false },
    ]);
  });

  it('al retomar SIN autorizaciones en el back: rehidrata desde el borrador local (persistencia)', () => {
    clearAnalisisDraft(42);
    writeAnalisisDraft(42, {
      isUrgent: true,
      rows: [{ id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true }],
    });
    const store = (fixture.componentInstance as any)['store'];
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        detail: { id: 42, isUrgent: false, analysisAuthorizations: [] } as any,
      },
    });
    store.refreshState();

    const f = TestBed.createComponent(AnalisisStepComponent);
    f.componentRef.setInput('atencionId', 42);
    f.detectChanges();

    expect(f.componentInstance.isUrgentValue).toBe(true);
    expect(f.componentInstance.initialItems()).toEqual([
      { id: 3, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: null, isAuthorized: true },
    ]);
    clearAnalisisDraft(42);
  });

  it('onContinue deduplica items por analysisId antes de despachar', () => {
    setDetailInsurancePlan(7); // obra social ⇒ se respeta isAuthorized por fila
    fixture.componentInstance.onItemsChanged([
      makeRow({ id: 5, isAuthorized: false }),
      makeRow({ id: 5, isAuthorized: true }),
      makeRow({ id: 9, shortCode: '2001', name: 'Glucemia', isAuthorized: true }),
    ]);
    fixture.componentInstance.onContinue();
    expect(dispatched[0].payload.items).toEqual([
      { analysisId: 5, isAuthorized: false },
      { analysisId: 9, isAuthorized: true },
    ]);
  });

  it('NEW-E: en readOnly no se renderiza "Continuar" ni "Volver fase"', () => {
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b: any) => b.textContent ?? '');
    expect(labels.some((l: string) => l.includes('Continuar'))).toBe(false);
    expect(labels.some((l: string) => l.includes('Volver fase'))).toBe(false);
  });

  it('onItemsChanged actualiza la lista de items para el dispatch', () => {
    setDetailInsurancePlan(7); // obra social ⇒ se respeta isAuthorized por fila
    const rows = [makeRow({ id: 3, isAuthorized: true }), makeRow({ id: 4, shortCode: '2001', name: 'Bio', isAuthorized: false })];
    fixture.componentInstance.onItemsChanged(rows);
    fixture.componentInstance.onContinue();
    const dispatched0 = dispatched[0];
    expect(dispatched0.payload.items).toEqual([
      { analysisId: 3, isAuthorized: true },
      { analysisId: 4, isAuthorized: false },
    ]);
  });

  // ── KAN-140: modo urgente express ─────────────────────────────────────────

  function setDetailUrgent(isUrgent: boolean): void {
    const store = (fixture.componentInstance as any)['store'];
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        detail: { id: 42, insurancePlanId: null, isUrgent, analysisAuthorizations: [] } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
  }

  it('KAN-140: en modo urgente con Urgencias activo, onIniciarUrgente despacha advanceUrgent', () => {
    registry.isActive.mockImplementation((key: string) => key === ModuleKey.Urgencias);
    setDetailUrgent(true);
    fixture.componentInstance.onAnalysisAdded(makeRow());
    fixture.componentInstance.onIniciarUrgente();
    expect(dispatched.find((a) => a.type === A.advanceUrgent.type)).toBeTruthy();
    expect(dispatched.find((a) => a.type === A.addAnalysisList.type)).toBeUndefined();
  });

  it('KAN-140: en modo normal (no urgente), onIniciarUrgente NO existe y onContinue despacha addAnalysisList', () => {
    registry.isActive.mockReturnValue(false);
    setDetailUrgent(false);
    fixture.componentInstance.onAnalysisAdded(makeRow());
    fixture.componentInstance.onContinue();
    expect(dispatched.find((a) => a.type === A.addAnalysisList.type)).toBeTruthy();
  });

  it('KAN-140: en modo urgente con Urgencias activo, modoExpress() devuelve true', () => {
    registry.isActive.mockImplementation((key: string) => key === ModuleKey.Urgencias);
    setDetailUrgent(true);
    expect((fixture.componentInstance as any).modoExpress()).toBe(true);
  });

  it('KAN-140: con urgente=false, modoExpress() devuelve false aunque Urgencias esté activo', () => {
    registry.isActive.mockImplementation((key: string) => key === ModuleKey.Urgencias);
    setDetailUrgent(false);
    expect((fixture.componentInstance as any).modoExpress()).toBe(false);
  });

  it('KAN-140: con urgente=true pero Urgencias inactivo, modoExpress() devuelve false', () => {
    registry.isActive.mockReturnValue(false);
    setDetailUrgent(true);
    expect((fixture.componentInstance as any).modoExpress()).toBe(false);
  });
});
