import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import type { Action } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GenerarLiquidacionPage } from './generar-liquidacion.page';
import {
  selectLiqInsurers, selectLiqInsurerPlans, selectLiqGenerating,
  selectLiqPreviewDetail, selectLiqPreviewLoading,
} from '../../store/financiero.selectors';
import {
  loadInsurerPlans, generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { SettlementPreviewDetail } from '../../models/liquidaciones.model';

const OS = { id: 7, code: 'OS7', acronym: 'OS', name: 'IOMA', insurerType: 'SOCIAL' as const, insurerTypeName: 'Obra Social', active: true };

const PREVIEW: SettlementPreviewDetail = {
  insurerId: 7, proposedNumber: 5, previewWarning: null,
  netAmount: 1000, ivaAmount: 210, grossAmount: 1210,
  groups: [{
    planId: 3, planName: 'Plan A', ivaPercentage: 21, netAmount: 1000, ivaAmount: 210, grossAmount: 1210,
    items: [{
      providedServiceId: 11, patientId: 1, patientName: 'Ana', patientDni: '123', serviceDate: '2026-01-10',
      authorizationNumber: null, planId: 3, agreementId: null, ubValue: null, copaymentAmount: 0, coveredAmount: 1000,
      fullyExcluded: false, analyses: [{ analysisId: 100, code: 'X', name: 'Hemograma', ubUnits: 5, amount: 1000, excluded: false, authorized: true }],
    }],
  }],
};

let actions$: Subject<Action>;

function setup(preview: SettlementPreviewDetail | null = null) {
  actions$ = new Subject<Action>();
  return TestBed.configureTestingModule({
    imports: [GenerarLiquidacionPage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      provideMockActions(() => actions$),
      provideMockStore({
        selectors: [
          { selector: selectLiqInsurers, value: [OS] },
          { selector: selectLiqInsurerPlans, value: [] },
          { selector: selectLiqGenerating, value: false },
          { selector: selectLiqPreviewDetail, value: preview },
          { selector: selectLiqPreviewLoading, value: false },
        ],
      }),
    ],
  })
    .overrideComponent(WizardShellComponent, { set: { template: '<ng-content />', inputs: [] } })
    .compileComponents();
}

type Cmp = InstanceType<typeof GenerarLiquidacionPage> & {
  paso1Valido: () => boolean;
  continueDisabled: () => boolean;
  canGenerate: () => boolean;
  selectedPlanIds: { (): number[]; set: (v: number[]) => void };
  step: { (): number; set: (v: number) => void };
  os: { set: (v: unknown) => void };
  from: { set: (v: Date) => void };
  to: { set: (v: Date) => void };
  onOsChange: (i: unknown) => void;
  next: () => void;
  generar: () => void;
  onGroupSelectionChange: (group: unknown, rows: unknown[]) => void;
  excluirTodasGrupo: (group: unknown) => void;
  incluirTodasGrupo: (group: unknown) => void;
};

describe('GenerarLiquidacionPage — smoke', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('arranca en el paso 1 (Datos) con el wizard shell', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ui-wizard-shell'))).toBeTruthy();
  });

  it('el paso 1 no permite continuar sin OS, período ni planes', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();
    expect(cmp.paso1Valido()).toBe(false);
  });

  it('onOsChange dispatchea loadInsurerPlans para la OS elegida', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    cmp.onOsChange(OS);
    expect(dispatch).toHaveBeenCalledWith(loadInsurerPlans({ insurerId: 7 }));
  });

  it('los planes de la OS se tildan todos por defecto al cargarse', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    fixture.detectChanges();
    store.overrideSelector(selectLiqInsurerPlans, [{ id: 3, name: 'Plan A', iva: 21 }, { id: 4, name: 'Plan B', iva: 0 }]);
    store.refreshState();
    fixture.detectChanges();
    expect(cmp.selectedPlanIds()).toEqual([3, 4]);
  });

  it('paso1Valido requiere OS, período y al menos un plan tildado', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();
    cmp.os.set(OS);
    cmp.from.set(new Date(2026, 0, 1));
    cmp.to.set(new Date(2026, 0, 31));
    cmp.selectedPlanIds.set([]);
    expect(cmp.paso1Valido()).toBe(false);
    cmp.selectedPlanIds.set([3]);
    expect(cmp.paso1Valido()).toBe(true);
  });

  it('generar dispatchea generateSettlement con planIds', async () => {
    await setup(PREVIEW);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    cmp.os.set(OS);
    cmp.from.set(new Date(2026, 0, 1));
    cmp.to.set(new Date(2026, 0, 31));
    cmp.selectedPlanIds.set([3]);
    cmp.generar();
    expect(dispatch).toHaveBeenCalledWith(generateSettlement({
      body: {
        insurerId: 7,
        period: { from: '2026-01-01', to: '2026-01-31' },
        specialRules: [],
        excludedAnalysisIdsByPs: null,
        planIds: [3],
      },
    }));
  });

  it('post-generar navega al listado de liquidaciones', async () => {
    await setup(PREVIEW);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    actions$.next(generateSettlementSuccess({ settlement: { id: 99 } as never }));
    expect(navigate).toHaveBeenCalledWith(['/financiero/liquidaciones']);
  });

  it('destildar una prestación (sale de la selección) la excluye y recalcula', async () => {
    await setup(PREVIEW);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    cmp.os.set(OS);
    cmp.from.set(new Date(2026, 0, 1));
    cmp.to.set(new Date(2026, 0, 31));
    cmp.selectedPlanIds.set([3]);
    // La selección arranca con todas incluidas; el usuario destilda la única fila → selección vacía.
    cmp.onGroupSelectionChange(PREVIEW.groups[0], []);
    const last = dispatch.mock.calls.at(-1)?.[0] as { body?: { excludedAnalysisIdsByPs?: unknown } };
    expect(last.body?.excludedAnalysisIdsByPs).toEqual({ 11: [100] });
  });

  it('excluirTodasGrupo excluye todas las prestaciones del plan y recalcula', async () => {
    await setup(PREVIEW);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    const dispatch = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    cmp.os.set(OS);
    cmp.from.set(new Date(2026, 0, 1));
    cmp.to.set(new Date(2026, 0, 31));
    cmp.selectedPlanIds.set([3]);
    cmp.excluirTodasGrupo(PREVIEW.groups[0]);
    const last = dispatch.mock.calls.at(-1)?.[0] as { body?: { excludedAnalysisIdsByPs?: unknown } };
    expect(last.body?.excludedAnalysisIdsByPs).toEqual({ 11: [100] });
  });
});
