import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import type { Action } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { PollingService } from '@core/refresh';
import { WorklistPage } from './worklist.page';
import { MockSamplesService } from '../../services/mock-samples.service';
import { selectRecoleccionItems, selectDescarteItems, selectProcesamientoItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
import { selectTemplatesError } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { LabelWorklistItem } from '../../models/label-worklist.model';
import { transitionLabels, transitionLabelsSuccess } from '../../store/muestras.actions';

/**
 * Minimal test template: includes only the header (h1 + counters).
 * Sub-components (ScanBar, BatchMenu, SampleTable, TransitionDialog) use
 * Angular 17+ signal inputs which are not reflected in ɵcmp.inputs during
 * JIT compilation (the mode used by vitest). The full template would cause
 * NG0303 / NG0950 errors. The smoke test validates component logic + header
 * rendering; the full template integration is covered by e2e / Karma.
 */
const SMOKE_TEMPLATE = `
<section class="worklist-page">
  <header class="worklist-header">
    <div>
      <h1>{{ config().title }}</h1>
      <p class="subtitle">{{ config().sub }}</p>
    </div>
    <div class="stats">
      <span class="chip">{{ total() }} · {{ config().countLabel }}</span>
      <span class="chip" [class.chip-selected]="selectedCount() > 0">
        {{ selectedCount() }} · seleccionada(s) de {{ total() }}
      </span>
    </div>
  </header>
</section>
`;

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
}

let actions$: Subject<Action>;

function setup(
  screenKey: 'recoleccion' | 'traslado' | 'procesamiento' | 'descarte',
  recoleccionItems: LabelWorklistItem[] = [],
  descarteItems: LabelWorklistItem[] = [],
  procesamientoItems: LabelWorklistItem[] = [],
): ComponentFixture<WorklistPage> {
  installLocalStorageMock();
  actions$ = new Subject<Action>();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WorklistPage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      provideMockActions(() => actions$),
      MockSamplesService,
      { provide: ActivatedRoute, useValue: { snapshot: { data: { screenKey } } } },
      provideMockStore({
        selectors: [
          { selector: selectRecoleccionItems, value: recoleccionItems },
          { selector: selectDescarteItems, value: descarteItems },
          { selector: selectProcesamientoItems, value: procesamientoItems },
          { selector: selectMuestrasBranchName, value: 'CENTRAL' },
          { selector: selectMuestrasError, value: null },
          { selector: selectTemplatesError, value: null },
        ],
      }),
      {
        provide: PollingService,
        useValue: { startPolling: vi.fn(() => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() })) },
      },
    ],
  });
  TestBed.overrideTemplate(WorklistPage, SMOKE_TEMPLATE);
  const fixture = TestBed.createComponent(WorklistPage);
  fixture.detectChanges();
  return fixture;
}

function getStore(fixture: ComponentFixture<WorklistPage>): MockStore {
  return TestBed.inject(MockStore);
}

describe('WorklistPage (smoke)', () => {
  it('renderiza Recolección con título y count store-driven (vacío)', () => {
    const fx = setup('recoleccion');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Recolección');
    expect(fx.componentInstance.total()).toBe(0);
  });

  it('Recolección mapea items del store al view-model', () => {
    const item: LabelWorklistItem = {
      labelId: 60005, sampleId: null, barcode: '60005', protocolId: 50001, analysisName: 'Hemograma',
      patientName: 'Ana López', urgent: false, status: 'COLLECTED', updatedAt: '2026-06-11T10:00:00Z',
    };
    const fx = setup('recoleccion', [item]);
    const cmp = fx.componentInstance;
    expect(cmp.total()).toBe(1);
    expect(cmp.rows()[0].study).toBe('Hemograma');
  });

  it('renderiza Traslado con título correcto', () => {
    const fx = setup('traslado');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Traslado');
    expect(fx.componentInstance.total()).toBe(10);
  });

  it('renderiza Procesamiento con título correcto (backend, vacío)', () => {
    const fx = setup('procesamiento');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Procesamiento');
    expect(fx.componentInstance.total()).toBe(0);
  });

  it('Procesamiento mapea items PROCESSING del store al view-model agrupado', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 50005, analysisName: 'Hemograma',
      patientName: 'Marta Gómez', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    expect(cmp.total()).toBe(1);
    expect(cmp.rows()[0].study).toBe('Hemograma');
  });

  it('Procesamiento es read-only: canTransition = false', () => {
    const fx = setup('procesamiento');
    expect(fx.componentInstance.canTransition()).toBe(false);
  });

  it('Procesamiento muestra acciones de planilla (showWorksheetActions = true)', () => {
    const fx = setup('procesamiento');
    expect(fx.componentInstance.showWorksheetActions()).toBe(true);
  });

  it('Recolección NO muestra acciones de planilla', () => {
    const fx = setup('recoleccion');
    expect(fx.componentInstance.showWorksheetActions()).toBe(false);
  });

  it('renderiza Descarte con título correcto (mock vacío)', () => {
    const fx = setup('descarte');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Descarte');
    expect(fx.componentInstance.total()).toBe(0);
  });

  it('Descarte mapea items del store al view-model agrupado', () => {
    const item: LabelWorklistItem = {
      labelId: 90001, sampleId: null, barcode: '90001', protocolId: 50003,
      analysisName: 'Cultivo', patientName: 'Carlos Ruiz', urgent: false,
      status: 'REJECTED', updatedAt: '2026-06-12T09:00:00Z',
      rejectionReason: 'Hemólisis severa',
    };
    const fx = setup('descarte', [], [item]);
    const cmp = fx.componentInstance;
    expect(cmp.total()).toBe(1);
    expect(cmp.rows()[0].study).toBe('Cultivo');
  });

  it('Descarte es read-only: canTransition = false', () => {
    const fx = setup('descarte');
    expect(fx.componentInstance.canTransition()).toBe(false);
  });

  it('Recolección tiene canTransition = true', () => {
    const fx = setup('recoleccion');
    expect(fx.componentInstance.canTransition()).toBe(true);
  });

  it('Traslado (mock) tiene canTransition = true', () => {
    const fx = setup('traslado');
    expect(fx.componentInstance.canTransition()).toBe(true);
  });

  it('toggleRow selecciona y deselecciona', () => {
    const item: LabelWorklistItem = {
      labelId: 70010, sampleId: 50060, barcode: '70010', protocolId: 50005, analysisName: 'Glucosa',
      patientName: 'Luis Soto', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:05:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    const firstId = cmp.rows()[0].id;
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(1);
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(0);
  });

  it('query filtra rows en vivo', () => {
    const item: LabelWorklistItem = {
      labelId: 70011, sampleId: 50061, barcode: '70011', protocolId: 50005, analysisName: 'Urea',
      patientName: 'Rosa Vera', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:06:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    cmp.setQuery('70011');
    expect(cmp.rows().length).toBe(1);
    expect(cmp.rows()[0].barcode).toBe('70011');
  });

  it('Recolección agrupa dos labels del mismo sampleId en UN tubo', () => {
    const items: LabelWorklistItem[] = [
      {
        labelId: 60010, sampleId: 50010, barcode: '60010', protocolId: 50001,
        analysisName: 'Hemograma', patientName: 'Juan Pérez', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z',
      },
      {
        labelId: 60011, sampleId: 50010, barcode: '60011', protocolId: 50001,
        analysisName: 'Glucosa', patientName: 'Juan Pérez', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:01:00Z',
      },
    ];
    const fx = setup('recoleccion', items);
    const cmp = fx.componentInstance;
    expect(cmp.total()).toBe(1);
    expect(cmp.rows()[0].study).toBe('2 análisis');
  });

  it('confirmDialog (backend) despacha transitionLabels con AMBOS labelIds del tubo', async () => {
    const items: LabelWorklistItem[] = [
      {
        labelId: 60020, sampleId: 50020, barcode: '60020', protocolId: 50001,
        analysisName: 'Hemograma', patientName: 'Ana García', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z',
      },
      {
        labelId: 60021, sampleId: 50020, barcode: '60021', protocolId: 50001,
        analysisName: 'Colesterol', patientName: 'Ana García', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:01:00Z',
      },
    ];
    const fx = setup('recoleccion', items);
    const cmp = fx.componentInstance;
    const store = getStore(fx);

    const dispatched: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any).dispatch = (action: unknown) => { dispatched.push(action); };

    // Seleccionar el tubo
    const tubeId = cmp.rows()[0].id;
    cmp.toggleRow(tubeId);
    expect(cmp.selectedCount()).toBe(1);

    // Simular apertura de transición y confirmación
    const transition = cmp.config().targets[0];
    cmp.selectTransition(transition);
    await cmp.confirmDialog({ dest: {}, note: '' });

    expect(dispatched).toHaveLength(1);
    const action = dispatched[0] as ReturnType<typeof transitionLabels>;
    expect(action.type).toBe('[Muestras Page] Transition Labels');
    expect(action.labelIds).toContain(60020);
    expect(action.labelIds).toContain(60021);
    expect(action.labelIds).toHaveLength(2);
  });

  it('confirmDialog (backend) NO muestra toast optimista — espera transitionLabelsSuccess', async () => {
    const items: LabelWorklistItem[] = [
      {
        labelId: 60030, sampleId: 50030, barcode: '60030', protocolId: 50001,
        analysisName: 'Hemograma', patientName: 'Pedro Ruiz', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z',
      },
    ];
    const fx = setup('recoleccion', items);
    const cmp = fx.componentInstance;
    const messages = fx.debugElement.injector.get(MessageService);
    const add = vi.spyOn(messages, 'add');

    cmp.toggleRow(cmp.rows()[0].id);
    const transition = cmp.config().targets[0];
    cmp.selectTransition(transition);
    await cmp.confirmDialog({ dest: {}, note: '' });

    // No debe haber toast de éxito inmediatamente después del dispatch
    expect(add).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('muestra toast de éxito en Recolección cuando llega transitionLabelsSuccess', async () => {
    const items: LabelWorklistItem[] = [
      {
        labelId: 60040, sampleId: 50040, barcode: '60040', protocolId: 50001,
        analysisName: 'Glucemia', patientName: 'Laura Díaz', urgent: false,
        status: 'COLLECTED', updatedAt: '2026-06-12T10:00:00Z',
      },
    ];
    const fx = setup('recoleccion', items);
    const cmp = fx.componentInstance;
    const messages = fx.debugElement.injector.get(MessageService);
    const add = vi.spyOn(messages, 'add');

    cmp.toggleRow(cmp.rows()[0].id);
    const transition = cmp.config().targets[0];
    cmp.selectTransition(transition);
    await cmp.confirmDialog({ dest: {}, note: '' });

    // Aún no hay toast
    expect(add).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));

    // Backend confirma → el toast debe aparecer
    actions$.next(transitionLabelsSuccess({ labelIds: [60040], transitionKey: transition.key }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('Procesamiento: openPlanillas/closePlanillas alterna el flag', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    expect(cmp.planillasOpen()).toBe(false);
    cmp.openPlanillas();
    expect(cmp.planillasOpen()).toBe(true);
    cmp.closePlanillas();
    expect(cmp.planillasOpen()).toBe(false);
  });

  it('Procesamiento: newSheet abre config en modo creación y cierra planillas', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    cmp.openPlanillas();
    cmp.onNewSheet();
    expect(cmp.editingTemplateId()).toBeNull();
    expect(cmp.configOpen()).toBe(true);
    expect(cmp.planillasOpen()).toBe(false);
  });

  it('Procesamiento: editSheet abre config con el id', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    cmp.onEditSheet(5);
    expect(cmp.editingTemplateId()).toBe(5);
    expect(cmp.configOpen()).toBe(true);
  });

  it('Procesamiento: selectedProtocolIds vacío sin selección, [protocolId] con un tubo', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'Hemograma',
      patientName: 'Marta', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    expect(cmp.selectedProtocolIds()).toEqual([]);
    cmp.toggleRow(cmp.rows()[0].id);
    expect(cmp.selectedProtocolIds()).toEqual([88]);
  });

  it('Procesamiento: selectedProtocolIds junta protocolIds distintos de varios tubos', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'A', patientName: 'M', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z' },
      { labelId: 70002, sampleId: 50051, barcode: '70002', protocolId: 99, analysisName: 'B', patientName: 'N', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:01:00Z' },
      { labelId: 70003, sampleId: 50052, barcode: '70003', protocolId: 88, analysisName: 'C', patientName: 'O', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:02:00Z' },
    ];
    const fx = setup('procesamiento', [], [], items);
    const cmp = fx.componentInstance;
    cmp.toggleRow(cmp.rows()[0].id); cmp.toggleRow(cmp.rows()[1].id); cmp.toggleRow(cmp.rows()[2].id);
    expect(cmp.selectedProtocolIds().sort((a, b) => a - b)).toEqual([88, 99]);
  });

  it('Procesamiento: cargarResultados navega con query param protocols (CSV distinto)', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'A', patientName: 'M', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z' },
      { labelId: 70002, sampleId: 50051, barcode: '70002', protocolId: 99, analysisName: 'B', patientName: 'N', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:01:00Z' },
    ];
    const fx = setup('procesamiento', [], [], items);
    const cmp = fx.componentInstance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigate = vi.spyOn((cmp as any).router, 'navigate').mockResolvedValue(true);
    cmp.toggleRow(cmp.rows()[0].id); cmp.toggleRow(cmp.rows()[1].id);
    cmp.cargarResultados();
    expect(navigate).toHaveBeenCalledWith(['/analitica/procesamiento/cargar'], { queryParams: { protocols: '88,99' } });
  });
});
