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

/** Preview con dos planes y varias prestaciones/análisis, para tabs + búsqueda. */
const PREVIEW_MULTI: SettlementPreviewDetail = {
  insurerId: 7, proposedNumber: 6, previewWarning: null,
  netAmount: 3000, ivaAmount: 630, grossAmount: 3630,
  groups: [
    {
      planId: 3, planName: 'Plan A', ivaPercentage: 21, netAmount: 2000, ivaAmount: 420, grossAmount: 2420,
      items: [
        {
          providedServiceId: 11, patientId: 1, patientName: 'Ana Gómez', patientDni: '111', serviceDate: '2026-01-10',
          authorizationNumber: 'AUT-900', planId: 3, agreementId: null, ubValue: null, copaymentAmount: 0, coveredAmount: 1000,
          fullyExcluded: false, analyses: [{ analysisId: 100, code: 'HEM', name: 'Hemograma', ubUnits: 5, amount: 1000, excluded: false, authorized: true }],
        },
        {
          providedServiceId: 12, patientId: 2, patientName: 'Beto Ruiz', patientDni: '222', serviceDate: '2026-01-11',
          authorizationNumber: 'AUT-901', planId: 3, agreementId: null, ubValue: null, copaymentAmount: 0, coveredAmount: 1000,
          fullyExcluded: false, analyses: [{ analysisId: 101, code: 'GLU', name: 'Glucemia', ubUnits: 5, amount: 1000, excluded: false, authorized: true }],
        },
      ],
    },
    {
      planId: 4, planName: 'Plan B', ivaPercentage: 0, netAmount: 1000, ivaAmount: 0, grossAmount: 1000,
      items: [
        {
          providedServiceId: 21, patientId: 3, patientName: 'Caro Díaz', patientDni: '333', serviceDate: '2026-01-12',
          authorizationNumber: 'AUT-902', planId: 4, agreementId: null, ubValue: null, copaymentAmount: 0, coveredAmount: 1000,
          fullyExcluded: false, analyses: [{ analysisId: 102, code: 'TSH', name: 'Tirotrofina', ubUnits: 5, amount: 1000, excluded: false, authorized: true }],
        },
      ],
    },
  ],
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
  selectedPlans: () => Array<{ id: number; name: string; hasActiveAgreement: boolean }>;
  noPlanConvenio: () => boolean;
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
  activePlanTab: { (): number | null; set: (v: number | null) => void };
  reviewSearch: { (): string; set: (v: string) => void };
  visibleGroups: () => Array<{ planId: number; items: unknown[] }>;
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
    store.overrideSelector(selectLiqInsurerPlans, [
      { id: 3, name: 'Plan A', iva: 21, arancel: 1500, hasActiveAgreement: true },
      { id: 4, name: 'Plan B', iva: 0, arancel: 900, hasActiveAgreement: true },
    ]);
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

  // ── Feature C: convenios de los planes tildados ──────────────────────────────
  it('noPlanConvenio bloquea paso1Valido si NINGÚN plan tildado tiene convenio vigente', async () => {
    await setup();
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    const store = TestBed.inject(MockStore);
    fixture.detectChanges();
    store.overrideSelector(selectLiqInsurerPlans, [
      { id: 3, name: 'Plan A', iva: 21, arancel: 1500, hasActiveAgreement: false },
      { id: 4, name: 'Plan B', iva: 0, arancel: 0, hasActiveAgreement: false },
    ]);
    store.refreshState();
    fixture.detectChanges();
    cmp.os.set(OS);
    cmp.from.set(new Date(2026, 0, 1));
    cmp.to.set(new Date(2026, 0, 31));
    // el effect tilda todos por defecto → [3,4], ambos sin convenio
    expect(cmp.noPlanConvenio()).toBe(true);
    expect(cmp.paso1Valido()).toBe(false);
    // si al menos uno tiene convenio, se puede continuar
    cmp.selectedPlanIds.set([3]);
    store.overrideSelector(selectLiqInsurerPlans, [
      { id: 3, name: 'Plan A', iva: 21, arancel: 1500, hasActiveAgreement: true },
      { id: 4, name: 'Plan B', iva: 0, arancel: 0, hasActiveAgreement: false },
    ]);
    store.refreshState();
    fixture.detectChanges();
    cmp.selectedPlanIds.set([3]);
    expect(cmp.noPlanConvenio()).toBe(false);
    expect(cmp.paso1Valido()).toBe(true);
  });

  // ── Feature D: tab por plan + búsqueda en el paso Revisar ─────────────────────
  it('el tab de plan filtra qué grupo se muestra; "Todos" (null) muestra ambos', async () => {
    await setup(PREVIEW_MULTI);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();
    // por defecto (null) → los dos grupos
    expect(cmp.visibleGroups().map(g => g.planId)).toEqual([3, 4]);
    cmp.activePlanTab.set(4);
    expect(cmp.visibleGroups().map(g => g.planId)).toEqual([4]);
    cmp.activePlanTab.set(null);
    expect(cmp.visibleGroups().map(g => g.planId)).toEqual([3, 4]);
  });

  it('la búsqueda filtra prestaciones por paciente, DNI, N° de autorización y nombre de análisis', async () => {
    await setup(PREVIEW_MULTI);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();

    // por nombre de análisis (case + acento-insensible): "hemograma" → solo la PS con Hemograma
    cmp.reviewSearch.set('hemograma');
    let vis = cmp.visibleGroups();
    expect(vis.map(g => g.planId)).toEqual([3]);
    expect((vis[0].items as Array<{ providedServiceId: number }>).map(i => i.providedServiceId)).toEqual([11]);

    // por nombre de paciente
    cmp.reviewSearch.set('caro');
    vis = cmp.visibleGroups();
    expect(vis.map(g => g.planId)).toEqual([4]);

    // por N° de autorización
    cmp.reviewSearch.set('AUT-901');
    vis = cmp.visibleGroups();
    expect((vis[0].items as Array<{ providedServiceId: number }>).map(i => i.providedServiceId)).toEqual([12]);

    // por DNI
    cmp.reviewSearch.set('333');
    vis = cmp.visibleGroups();
    expect(vis.map(g => g.planId)).toEqual([4]);

    // sin match → sin grupos visibles
    cmp.reviewSearch.set('zzz');
    expect(cmp.visibleGroups()).toEqual([]);
  });

  it('la búsqueda respeta el tab activo (filtra dentro del plan elegido)', async () => {
    await setup(PREVIEW_MULTI);
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as Cmp;
    fixture.detectChanges();
    cmp.activePlanTab.set(3);
    cmp.reviewSearch.set('caro'); // Caro está en Plan B (4), no en el tab activo (3)
    expect(cmp.visibleGroups()).toEqual([]);
  });
});
