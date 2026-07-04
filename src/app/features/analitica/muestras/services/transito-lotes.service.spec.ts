import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TransitoLotesService, NO_SAMPLE_LINK_TEXT } from './transito-lotes.service';
import { dispatchTubes, deriveTubes } from '../store/muestras.actions';
import { SIN_DESTINO_GROUP_ID } from '../models/transito.model';
import type { SectionOption } from '../models/transito.model';
import type { Tube } from '../models/tube.model';
import type { RoutingResolveResponse, UnresolvableReason } from '../models/routing.model';

function installLocalStorageMock(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
  return store;
}

function tube(sampleId: number | null, labelIds: number[]): Tube {
  return {
    id: sampleId != null ? `t${sampleId}` : `l${labelIds[0]}`,
    sampleId,
    protocolId: 0,
    labelIds,
    analyses: labelIds.map(l => ({ labelId: l, barcode: `BC-${l}`, name: 'Hemograma' })) as any,
    barcode: labelIds.map(l => `BC-${l}`).join(' '),
    study: 'Hemograma', patient: 'García, M.', branch: 'CENTRAL',
    receivedAt: '2026-06-12T08:00:00Z', urgent: false, state: 'transito',
    rejectionReason: null,
  };
}

function routingOf(
  groups: { sectionId: number; areaName: string; sectionName: string; sampleIds: number[] }[],
  unresolvable: { sampleId: number; reason: UnresolvableReason }[] = [],
): RoutingResolveResponse {
  return {
    groups: groups.map(g => ({
      workSection: {
        branchId: 1001, areaId: 1, sectionId: g.sectionId,
        areaName: g.areaName, sectionName: g.sectionName, branchName: 'CENTRAL',
      },
      assignments: g.sampleIds.map(sid => ({
        protocolId: 1, sampleId: sid, analysisOrderId: sid, analysisName: 'Hemograma',
      })),
    })),
    unresolvable: unresolvable.map(u => ({
      protocolId: 1, sampleId: u.sampleId, analysisOrderId: u.sampleId,
      analysisName: 'Hemograma', reason: u.reason,
    })),
  };
}

// t101/t102 → ws-10 por routing; t103 unresolvable; l4 sin vínculo (sampleId null).
const T1 = tube(101, [1]);
const T2 = tube(102, [2]);
const T3 = tube(103, [3]);
const T4 = tube(null, [4]);
const ROUTING = routingOf(
  [{ sectionId: 10, areaName: 'Química', sectionName: 'Endocrinología', sampleIds: [101, 102] }],
  [{ sampleId: 103, reason: 'NO_SECTION_CONFIGURED' }],
);
const SECTION_OPTIONS: SectionOption[] = [
  { sectionId: 10, sectionName: 'Endocrinología', areaName: 'Química', label: 'Química · Endocrinología' },
  { sectionId: 20, sectionName: 'Citometría', areaName: 'Hematología', label: 'Hematología · Citometría' },
];

let svc: TransitoLotesService;
let dispatched: unknown[];

function setup(lsStore?: Map<string, string>): void {
  if (!lsStore) installLocalStorageMock();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideMockStore()] });
  const store = TestBed.inject(MockStore);
  dispatched = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (store as any).dispatch = (action: unknown) => { dispatched.push(action); };
  svc = TestBed.inject(TransitoLotesService);
}

function feed(): void {
  svc.setTubes([T1, T2, T3, T4]);
  svc.setRouting(ROUTING);
  svc.setBranch('CENTRAL', 1001);
  svc.setBranches([{ id: 1001, name: 'CENTRAL' }, { id: 1002, name: 'NORTE' }]);
  svc.setSectionOptions(SECTION_OPTIONS);
}

describe('TransitoLotesService — groups desde el routing real', () => {
  beforeEach(() => { setup(); feed(); });

  it('crea un grupo ws-{sectionId} por workSection con los nombres del routing', () => {
    const ws = svc.groups().find(g => g.id === 'ws-10')!;
    expect(ws).toBeDefined();
    expect(ws.branch).toBe('CENTRAL');
    expect(ws.area).toBe('Química');
    expect(ws.section).toBe('Endocrinología');
    expect(ws.sampleIds).toEqual(['t101', 't102']);
  });

  it('tubos no resolubles o sin vínculo caen en el grupo sin-destino', () => {
    const sd = svc.groups().find(g => g.id === SIN_DESTINO_GROUP_ID)!;
    expect(sd).toBeDefined();
    expect(sd.section).toBe('');
    expect(sd.sampleIds).toEqual(expect.arrayContaining(['t103', 'l4']));
    expect(sd.sampleIds).toHaveLength(2);
  });

  it('reasons traduce NO_SECTION_CONFIGURED y el tubo sin vínculo a texto en español', () => {
    expect(svc.reasons().get('t103')).toBe('El análisis no tiene sección configurada');
    expect(svc.reasons().get('l4')).toBe(NO_SAMPLE_LINK_TEXT);
  });

  it('reasons traduce NO_WORKSPACE_FOUND', () => {
    svc.setRouting(routingOf([], [{ sampleId: 101, reason: 'NO_WORKSPACE_FOUND' }]));
    expect(svc.reasons().get('t101')).toBe('La sucursal no tiene esa sección');
  });

  it('un tubo metido en un lote desaparece de los groups (invariante 1)', () => {
    svc.createLote(['t101']);
    const ws = svc.groups().find(g => g.id === 'ws-10')!;
    expect(ws.sampleIds).toEqual(['t102']);
  });

  it('sectionIdOf resuelve la sección implícita de un grupo ws-', () => {
    expect(svc.sectionIdOf('ws-10')).toBe(10);
    expect(svc.sectionIdOf(SIN_DESTINO_GROUP_ID)).toBeNull();
  });

  it('assignGroupSection sobre sin-destino setea sección manual + display', () => {
    svc.assignGroupSection(SIN_DESTINO_GROUP_ID, 20);
    expect(svc.sectionIdOf(SIN_DESTINO_GROUP_ID)).toBe(20);
    const sd = svc.groups().find(g => g.id === SIN_DESTINO_GROUP_ID)!;
    expect(sd.branch).toBe('CENTRAL');
    expect(sd.area).toBe('Hematología');
    expect(sd.section).toBe('Citometría');
  });

  it('stats refleja totales', () => {
    const s = svc.stats();
    expect(s.total).toBe(4);
    expect(s.groups).toBe(2); // ws-10 + sin-destino
    expect(s.lotes).toBe(0);
  });
});

describe('TransitoLotesService — selección', () => {
  beforeEach(() => { setup(); feed(); });

  it('toggleSel agrega/quita un ID del set', () => {
    svc.toggleSel('t101');
    expect(svc.sel().has('t101')).toBe(true);
    svc.toggleSel('t101');
    expect(svc.sel().has('t101')).toBe(false);
  });

  it('toggleSelMany con on=true agrega varios, con on=false los quita', () => {
    svc.toggleSelMany(['a', 'b', 'c'], true);
    expect(svc.sel().size).toBe(3);
    svc.toggleSelMany(['a', 'b'], false);
    expect(svc.sel().size).toBe(1);
    expect(svc.sel().has('c')).toBe(true);
  });

  it('clearSel vacía la selección', () => {
    svc.toggleSelMany(['a', 'b'], true);
    svc.clearSel();
    expect(svc.sel().size).toBe(0);
  });
});

describe('TransitoLotesService — lotes', () => {
  beforeEach(() => { setup(); feed(); });

  it('createLote saca las muestras de los groups y queda activo', () => {
    const loteId = svc.createLote(['t101', 't102']);
    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].id).toBe(loteId);
    expect(svc.lotes()[0].sampleIds).toEqual(['t101', 't102']);
    for (const g of svc.groups()) {
      expect(g.sampleIds).not.toContain('t101');
      expect(g.sampleIds).not.toContain('t102');
    }
    expect(svc.activeLoteId()).toBe(loteId);
    expect(svc.sel().size).toBe(0);
  });

  it('addToLote dedupea + saca la muestra de otro lote si la tenía', () => {
    const a = svc.createLote(['t101', 't102']);
    const b = svc.createLote(['t103']);

    svc.addToLote(a, ['t103']);

    expect(svc.lotes().find(l => l.id === a)!.sampleIds).toContain('t103');
    expect(svc.lotes().find(l => l.id === b)).toBeUndefined();
    const arr = svc.lotes().find(l => l.id === a)!.sampleIds;
    expect(new Set(arr).size).toBe(arr.length);
  });

  it('dissolveLote vuelve las muestras a su group recomendado', () => {
    const before = svc.groups().reduce((acc, g) => acc + g.sampleIds.length, 0);
    const loteId = svc.createLote(['t101', 't102']);
    svc.dissolveLote(loteId);
    expect(svc.lotes().length).toBe(0);
    const after = svc.groups().reduce((acc, g) => acc + g.sampleIds.length, 0);
    expect(after).toBe(before);
  });

  it('dissolveLote del único lote → activeLoteId queda null', () => {
    const loteId = svc.createLote(['t101']);
    svc.dissolveLote(loteId);
    expect(svc.activeLoteId()).toBeNull();
  });

  it('setActiveLote actualiza el activo', () => {
    const a = svc.createLote(['t101']);
    svc.setActiveLote(a);
    expect(svc.activeLoteId()).toBe(a);
    svc.setActiveLote(null);
    expect(svc.activeLoteId()).toBeNull();
  });

  it('updateDest sobre un lote setea nombres + ids reales de destino', () => {
    const id = svc.createLote(['t101']);
    svc.updateDest({ kind: 'lote', id }, {
      branch: 'NORTE', area: '', section: '', destinationBranchId: 1002, observation: 'cadena de frío',
    });
    const lote = svc.lotes().find(l => l.id === id)!;
    expect(lote.branch).toBe('NORTE');
    expect(lote.destinationBranchId).toBe(1002);
    expect(lote.observation).toBe('cadena de frío');
  });

  it('toggleEditing alterna el set', () => {
    svc.toggleEditing('ws-10');
    expect(svc.editing().has('ws-10')).toBe(true);
    svc.toggleEditing('ws-10');
    expect(svc.editing().has('ws-10')).toBe(false);
  });
});

describe('TransitoLotesService — send (backend real)', () => {
  beforeEach(() => { setup(); feed(); });

  it('send de un grupo ws- despacha dispatchTubes con {sampleId, sectionId}', () => {
    const result = svc.send('ws-10', 'group')!;
    expect(result).not.toBeNull();
    expect(dispatched).toEqual([dispatchTubes({
      checkIns: [{ sampleId: 101, sectionId: 10 }, { sampleId: 102, sectionId: 10 }],
    })]);
    expect(result.enProceso).toBe(2);
    expect(result.enTransito).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('send con tildes parciales envía solo las tildadas', () => {
    svc.toggleSelMany(['t101'], true);
    svc.send('ws-10', 'group');
    expect(dispatched).toEqual([dispatchTubes({ checkIns: [{ sampleId: 101, sectionId: 10 }] })]);
  });

  it('send de sin-destino sin sección asignada → null y no despacha', () => {
    const result = svc.send(SIN_DESTINO_GROUP_ID, 'group');
    expect(result).toBeNull();
    expect(dispatched).toHaveLength(0);
  });

  it('send de sin-destino con sección manual despacha los vinculados y skippea sin vínculo', () => {
    svc.assignGroupSection(SIN_DESTINO_GROUP_ID, 20);
    const result = svc.send(SIN_DESTINO_GROUP_ID, 'group')!;
    expect(dispatched).toEqual([dispatchTubes({ checkIns: [{ sampleId: 103, sectionId: 20 }] })]);
    expect(result.enProceso).toBe(1);
    expect(result.skipped).toBe(1); // l4 sin sampleId
  });

  it('send de lote sin destino → null', () => {
    const id = svc.createLote(['t101']);
    expect(svc.send(id, 'lote')).toBeNull();
    expect(dispatched).toHaveLength(0);
    expect(svc.lotes().find(l => l.id === id)).toBeDefined();
  });

  it('send de lote a la sucursal actual despacha dispatchTubes con su sectionId', () => {
    const id = svc.createLote(['t101', 't102']);
    svc.updateDest({ kind: 'lote', id }, {
      branch: 'CENTRAL', sectionId: 20, area: 'Hematología', section: 'Citometría',
    });
    const result = svc.send(id, 'lote')!;
    expect(dispatched).toEqual([dispatchTubes({
      checkIns: [{ sampleId: 101, sectionId: 20 }, { sampleId: 102, sectionId: 20 }],
    })]);
    expect(result.enProceso).toBe(2);
    expect(svc.lotes().find(l => l.id === id)).toBeUndefined();
  });

  it('send de lote a otra sucursal despacha deriveTubes con labels planos + observación', () => {
    const id = svc.createLote(['t101', 't102']);
    svc.updateDest({ kind: 'lote', id }, {
      branch: 'NORTE', destinationBranchId: 1002, observation: ' cadena de frío ',
    });
    const result = svc.send(id, 'lote')!;
    expect(dispatched).toEqual([deriveTubes({
      labelIds: [1, 2], destinationBranchId: 1002, tubeCount: 2, observation: 'cadena de frío',
    })]);
    expect(result.enTransito).toBe(2);
    expect(result.enProceso).toBe(0);
  });

  it('sendAll arma UN despacho atómico con los grupos resolubles y no toca lotes', () => {
    const loteId = svc.createLote(['t102']);
    const result = svc.sendAll();
    expect(dispatched).toEqual([dispatchTubes({ checkIns: [{ sampleId: 101, sectionId: 10 }] })]);
    expect(result.enProceso).toBe(1);
    expect(svc.lotes().find(l => l.id === loteId)).toBeDefined();
    // sin-destino sin asignación queda en pantalla
    expect(svc.groups().some(g => g.id === SIN_DESTINO_GROUP_ID)).toBe(true);
  });

  it('sendAll incluye sin-destino si tiene sección manual y skippea tubos sin vínculo', () => {
    svc.assignGroupSection(SIN_DESTINO_GROUP_ID, 20);
    const result = svc.sendAll();
    expect(dispatched).toEqual([dispatchTubes({
      checkIns: [
        { sampleId: 101, sectionId: 10 },
        { sampleId: 102, sectionId: 10 },
        { sampleId: 103, sectionId: 20 },
      ],
    })]);
    expect(result.enProceso).toBe(3);
    expect(result.skipped).toBe(1); // l4 sin sampleId
  });
});

describe('TransitoLotesService — scan', () => {
  beforeEach(() => { setup(); feed(); });

  it('scan con barcode exacto agrega al lote activo (outcome=added)', () => {
    svc.createLote(['t102']); // queda activo
    const result = svc.scan('BC-1');
    expect(result.outcome).toBe('added');
    expect(result.matchedId).toBe('t101');
    expect(svc.lotes()[0].sampleIds).toContain('t101');
  });

  it('scan sin lote activo crea uno nuevo y la agrega', () => {
    expect(svc.activeLoteId()).toBeNull();
    const result = svc.scan('BC-1');
    expect(result.outcome).toBe('added');
    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].sampleIds).toEqual(['t101']);
    expect(svc.activeLoteId()).toBe(svc.lotes()[0].id);
  });

  it('scan de muestra ya en lote activo → outcome=duplicate sin mutar', () => {
    svc.scan('BC-1');
    const result = svc.scan('BC-1');
    expect(result.outcome).toBe('duplicate');
    expect(result.duplicateLoteNumber).toBe(1);
    expect(svc.lotes()[0].sampleIds.length).toBe(1);
  });

  it('scan sin match → outcome=no-match, matchedId=null', () => {
    const result = svc.scan('CODE-INEXISTENTE-999');
    expect(result.outcome).toBe('no-match');
    expect(result.matchedId).toBeNull();
    expect(svc.lotes().length).toBe(0);
  });

  it('scan acepta match parcial (includes) cuando no hay exacto', () => {
    const result = svc.scan('C-3');
    expect(result.outcome).toBe('added');
    expect(result.matchedId).toBe('t103');
  });
});

describe('TransitoLotesService — localStorage', () => {
  let lsStore: Map<string, string>;

  beforeEach(() => {
    lsStore = installLocalStorageMock();
  });

  it('persiste lotes en cada mutación (shape backward-compatible)', () => {
    setup(lsStore);
    feed();
    svc.createLote(['t101']);
    TestBed.flushEffects();
    const raw = lsStore.get('analitica.traslado.lotes');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].sampleIds).toEqual(['t101']);
    expect(parsed[0]).toHaveProperty('branch');
    expect(parsed[0]).toHaveProperty('area');
    expect(parsed[0]).toHaveProperty('section');
    expect(parsed[0]).toHaveProperty('createdAt');
  });

  it('rehidrata lotes válidos del storage (shape viejo sin ids reales)', () => {
    lsStore.set('analitica.traslado.lotes', JSON.stringify([
      { id: 'lote-x', sampleIds: ['t101'], branch: '', area: '', section: '', createdAt: 1 },
    ]));
    setup(lsStore);
    feed();
    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].id).toBe('lote-x');
    expect(svc.lotes()[0].sampleIds).toEqual(['t101']);
  });

  it('la vista de lotes filtra sampleIds que ya no están en tránsito', () => {
    lsStore.set('analitica.traslado.lotes', JSON.stringify([
      { id: 'lote-x', sampleIds: ['t101', 'id-fantasma'], branch: '', area: '', section: '', createdAt: 1 },
    ]));
    setup(lsStore);
    feed();
    expect(svc.lotes()[0].sampleIds).toEqual(['t101']);
  });

  it('si el JSON del storage está roto, arranca vacío', () => {
    lsStore.set('analitica.traslado.lotes', '{not-json');
    setup(lsStore);
    feed();
    expect(svc.lotes().length).toBe(0);
  });
});
