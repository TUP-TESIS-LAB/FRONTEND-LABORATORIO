import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TransitoLotesService } from './transito-lotes.service';
import { MockSamplesService } from './mock-samples.service';
import type { Sample } from '../models/sample.model';

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

describe('TransitoLotesService — groups + selección', () => {
  let svc: TransitoLotesService;
  let samples: MockSamplesService;

  beforeEach(() => {
    installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    samples = TestBed.inject(MockSamplesService);
    svc = TestBed.inject(TransitoLotesService);
  });

  it('groups agrupa samples por (branch, area, section) según la mochila', () => {
    const groups = svc.groups();
    expect(Array.isArray(groups)).toBe(true);
    const allIds = new Set<string>();
    for (const g of groups) {
      expect(g.id).toBe(`${g.branch}|${g.area}|${g.section}`);
      for (const id of g.sampleIds) {
        expect(allIds.has(id)).toBe(false);
        allIds.add(id);
      }
    }
  });

  it('groups pone primero los que procesa CURRENT_BRANCH', () => {
    const groups = svc.groups();
    if (groups.length < 2) return; // tolerante a seeds chicas
    const idxCentral = groups.findIndex(g => g.branch === 'CENTRAL — Sede Central');
    const idxOtro = groups.findIndex(g => g.branch !== 'CENTRAL — Sede Central');
    if (idxCentral !== -1 && idxOtro !== -1) {
      expect(idxCentral).toBeLessThan(idxOtro);
    }
  });

  it('toggleSel agrega/quita un ID del set', () => {
    svc.toggleSel('s-1');
    expect(svc.sel().has('s-1')).toBe(true);
    svc.toggleSel('s-1');
    expect(svc.sel().has('s-1')).toBe(false);
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

  it('stats refleja totales', () => {
    const s = svc.stats();
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.groups).toBe(svc.groups().length);
    expect(s.lotes).toBe(0);
  });
});

describe('TransitoLotesService — lotes', () => {
  let svc: TransitoLotesService;

  beforeEach(() => {
    installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    svc = TestBed.inject(TransitoLotesService);
  });

  it('createLote saca las muestras de los groups (invariante 1)', () => {
    const firstGroup = svc.groups()[0];
    expect(firstGroup).toBeDefined();
    const ids = firstGroup.sampleIds.slice(0, 2);

    const loteId = svc.createLote(ids);

    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].id).toBe(loteId);
    expect(svc.lotes()[0].sampleIds).toEqual(ids);
    // las muestras ya no aparecen en ningún group
    for (const g of svc.groups()) for (const id of ids) expect(g.sampleIds).not.toContain(id);
    // el lote queda activo
    expect(svc.activeLoteId()).toBe(loteId);
    // selección limpia tras crear
    expect(svc.sel().size).toBe(0);
  });

  it('addToLote dedupea + saca la muestra de otro lote si la tenía (invariante 1)', () => {
    const ids = svc.groups()[0].sampleIds.slice(0, 3);
    const a = svc.createLote([ids[0], ids[1]]);
    const b = svc.createLote([ids[2]]);

    svc.addToLote(a, [ids[2]]); // mover desde b a a

    expect(svc.lotes().find(l => l.id === a)!.sampleIds).toContain(ids[2]);
    // b queda vacío → debe haberse filtrado
    expect(svc.lotes().find(l => l.id === b)).toBeUndefined();
    // ids[2] no aparece en ningún lote != a
    for (const l of svc.lotes()) {
      if (l.id !== a) expect(l.sampleIds).not.toContain(ids[2]);
    }
    // sin duplicado dentro de a
    const arr = svc.lotes().find(l => l.id === a)!.sampleIds;
    expect(new Set(arr).size).toBe(arr.length);
  });

  it('addToLote elimina el lote origen si quedó vacío', () => {
    const ids = svc.groups()[0].sampleIds.slice(0, 2);
    const a = svc.createLote([ids[0]]);
    const b = svc.createLote([ids[1]]);

    svc.addToLote(a, [ids[1]]); // b se queda sin nada

    expect(svc.lotes().some(l => l.id === b)).toBe(false);
    expect(svc.lotes().length).toBe(1);
  });

  it('dissolveLote vuelve las muestras a su group recomendado (invariante 4)', () => {
    const ids = svc.groups()[0].sampleIds.slice(0, 2);
    const loteId = svc.createLote(ids);

    // verifico que no están en ningún group
    const beforeCount = svc.groups().reduce((acc, g) => acc + g.sampleIds.length, 0);

    svc.dissolveLote(loteId);

    expect(svc.lotes().length).toBe(0);
    const afterCount = svc.groups().reduce((acc, g) => acc + g.sampleIds.length, 0);
    expect(afterCount).toBe(beforeCount + ids.length);
  });

  it('dissolveLote del único lote → activeLoteId queda null', () => {
    const ids = svc.groups()[0].sampleIds.slice(0, 1);
    const loteId = svc.createLote(ids);
    svc.dissolveLote(loteId);
    expect(svc.activeLoteId()).toBeNull();
  });

  it('setActiveLote actualiza el activo', () => {
    const a = svc.createLote(svc.groups()[0].sampleIds.slice(0, 1));
    const b = svc.createLote(svc.groups()[0].sampleIds.slice(0, 1));
    svc.setActiveLote(a);
    expect(svc.activeLoteId()).toBe(a);
    svc.setActiveLote(null);
    expect(svc.activeLoteId()).toBeNull();
  });
});

describe('TransitoLotesService — updateDest', () => {
  let svc: TransitoLotesService;
  beforeEach(() => {
    installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    svc = TestBed.inject(TransitoLotesService);
  });

  it('updateDest sobre un lote setea branch/area/section', () => {
    const id = svc.createLote(svc.groups()[0].sampleIds.slice(0, 1));
    svc.updateDest({ kind: 'lote', id }, { branch: 'SUR — Lanús', area: 'Hematología', section: 'Citometría' });
    const lote = svc.lotes().find(l => l.id === id)!;
    expect(lote.branch).toBe('SUR — Lanús');
    expect(lote.area).toBe('Hematología');
    expect(lote.section).toBe('Citometría');
  });

  it('updateDest sobre un group pisa la recomendación en el siguiente render', () => {
    const groupBefore = svc.groups()[0];
    svc.updateDest(
      { kind: 'group', id: groupBefore.id },
      { branch: 'OESTE — Morón', area: groupBefore.area, section: groupBefore.section },
    );
    const after = svc.groups().find(g => g.area === groupBefore.area && g.section === groupBefore.section);
    expect(after?.branch).toBe('OESTE — Morón');
  });

  it('toggleEditing alterna el set', () => {
    svc.toggleEditing('group-x');
    expect(svc.editing().has('group-x')).toBe(true);
    svc.toggleEditing('group-x');
    expect(svc.editing().has('group-x')).toBe(false);
  });
});

describe('TransitoLotesService — send', () => {
  let svc: TransitoLotesService;
  let samples: MockSamplesService;

  beforeEach(() => {
    installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    samples = TestBed.inject(MockSamplesService);
    svc = TestBed.inject(TransitoLotesService);
  });

  it('send a lote sin destino → null (invariante 6)', async () => {
    const id = svc.createLote(svc.groups()[0].sampleIds.slice(0, 1));
    const result = await svc.send(id, 'lote');
    expect(result).toBeNull();
    expect(svc.lotes().find(l => l.id === id)).toBeDefined();
  });

  it('send con tildes parciales envía solo las tildadas (invariante 5)', async () => {
    vi.useFakeTimers();
    const group = svc.groups().find(g => g.sampleIds.length >= 2);
    if (!group) {
      // seed no tiene un group con ≥2 muestras en tránsito → test no aplica
      vi.useRealTimers();
      return;
    }
    const all = group.sampleIds;
    svc.toggleSelMany([all[0]], true);

    const beforeCount = samples.byState('transito')().length;
    const promise = svc.send(group.id, 'group');
    await vi.advanceTimersByTimeAsync(360);
    const result = await promise;

    expect(result).not.toBeNull();
    const afterCount = samples.byState('transito')().length;
    expect(beforeCount - afterCount).toBe(1);
    vi.useRealTimers();
  });

  it('send sin tildes envía todo el group', async () => {
    vi.useFakeTimers();
    const group = svc.groups()[0];
    const expectedSent = group.sampleIds.length;
    const beforeCount = samples.byState('transito')().length;

    const promise = svc.send(group.id, 'group');
    await vi.advanceTimersByTimeAsync(360);
    await promise;

    expect(beforeCount - samples.byState('transito')().length).toBe(expectedSent);
    vi.useRealTimers();
  });

  it('outcome en-proceso si branch === CURRENT_BRANCH', async () => {
    vi.useFakeTimers();
    const here = svc.groups().find(g => g.branch === 'CENTRAL — Sede Central');
    if (!here) return;
    const promise = svc.send(here.id, 'group');
    await vi.advanceTimersByTimeAsync(360);
    const result = await promise;
    expect(result!.enProceso).toBeGreaterThan(0);
    expect(result!.enTransito).toBe(0);
    vi.useRealTimers();
  });

  it('outcome en-transito si branch !== CURRENT_BRANCH', async () => {
    vi.useFakeTimers();
    const other = svc.groups().find(g => g.branch !== 'CENTRAL — Sede Central');
    if (!other) return;
    const promise = svc.send(other.id, 'group');
    await vi.advanceTimersByTimeAsync(360);
    const result = await promise;
    expect(result!.enTransito).toBeGreaterThan(0);
    expect(result!.enProceso).toBe(0);
    vi.useRealTimers();
  });

  it('sendAll envía todos los groups, no toca lotes (invariante 8)', async () => {
    vi.useFakeTimers();
    const loteId = svc.createLote(svc.groups()[0].sampleIds.slice(0, 1));
    const totalGroupsBefore = svc.groups().reduce((acc, g) => acc + g.sampleIds.length, 0);

    const promise = svc.sendAll();
    await vi.advanceTimersByTimeAsync(360 * 20);
    const result = await promise;

    expect(result.enProceso + result.enTransito).toBe(totalGroupsBefore);
    expect(svc.lotes().find(l => l.id === loteId)).toBeDefined();
    vi.useRealTimers();
  });
});

describe('TransitoLotesService — scan', () => {
  let svc: TransitoLotesService;
  let samples: MockSamplesService;

  beforeEach(() => {
    installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    samples = TestBed.inject(MockSamplesService);
    svc = TestBed.inject(TransitoLotesService);
  });

  it('scan con barcode exacto agrega al lote activo (outcome=added)', () => {
    const groupSample = svc.groups()[0].sampleIds[0];
    const sample = samples.samples().find(s => s.id === groupSample)!;
    svc.createLote([]); // crear lote vacío, queda activo
    const result = svc.scan(sample.barcode);
    expect(result.outcome).toBe('added');
    expect(result.matchedId).toBe(sample.id);
    expect(svc.lotes()[0].sampleIds).toContain(sample.id);
  });

  it('scan sin lote activo crea uno nuevo y la agrega', () => {
    expect(svc.activeLoteId()).toBeNull();
    const sample = samples.samples().find(s => s.state === 'transito')!;
    const result = svc.scan(sample.barcode);
    expect(result.outcome).toBe('added');
    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].sampleIds).toContain(sample.id);
    expect(svc.activeLoteId()).toBe(svc.lotes()[0].id);
  });

  it('scan de muestra ya en lote activo → outcome=duplicate sin mutar', () => {
    const sample = samples.samples().find(s => s.state === 'transito')!;
    svc.scan(sample.barcode);
    const result = svc.scan(sample.barcode);
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
    const sample = samples.samples().find(s => s.state === 'transito')!;
    const partial = sample.barcode.slice(-5);
    const result = svc.scan(partial);
    expect(result.outcome).toBe('added');
    expect(result.matchedId).toBe(sample.id);
  });
});

describe('TransitoLotesService — localStorage', () => {
  let lsStore: Map<string, string>;

  beforeEach(() => {
    lsStore = installLocalStorageMock();
    TestBed.resetTestingModule();
  });

  it('persiste lotes en cada mutación', () => {
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const svc = TestBed.inject(TransitoLotesService);
    const ids = svc.groups()[0].sampleIds.slice(0, 1);
    svc.createLote(ids);
    TestBed.flushEffects();
    const raw = lsStore.get('analitica.traslado.lotes');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].sampleIds).toEqual(ids);
  });

  it('rehidrata lotes válidos del storage', () => {
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const samples = TestBed.inject(MockSamplesService);
    const realId = samples.byState('transito')()[0].id;
    lsStore.set('analitica.traslado.lotes', JSON.stringify([
      { id: 'lote-x', sampleIds: [realId], branch: '', area: '', section: '', createdAt: 1 },
    ]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const svc = TestBed.inject(TransitoLotesService);

    expect(svc.lotes().length).toBe(1);
    expect(svc.lotes()[0].id).toBe('lote-x');
  });

  it('descarta sampleIds que ya no están en tránsito al rehidratar', () => {
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const samples = TestBed.inject(MockSamplesService);
    const realId = samples.byState('transito')()[0].id;
    lsStore.set('analitica.traslado.lotes', JSON.stringify([
      { id: 'lote-x', sampleIds: [realId, 'id-fantasma'], branch: '', area: '', section: '', createdAt: 1 },
    ]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const svc = TestBed.inject(TransitoLotesService);

    expect(svc.lotes()[0].sampleIds).toEqual([realId]);
  });

  it('elimina lotes que quedan vacíos tras rehidratar', () => {
    lsStore.set('analitica.traslado.lotes', JSON.stringify([
      { id: 'lote-x', sampleIds: ['id-fantasma'], branch: '', area: '', section: '', createdAt: 1 },
    ]));
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const svc = TestBed.inject(TransitoLotesService);
    expect(svc.lotes().length).toBe(0);
  });

  it('si el JSON del storage está roto, arranca vacío', () => {
    lsStore.set('analitica.traslado.lotes', '{not-json');
    TestBed.configureTestingModule({ providers: [MockSamplesService, TransitoLotesService] });
    const svc = TestBed.inject(TransitoLotesService);
    expect(svc.lotes().length).toBe(0);
  });
});
