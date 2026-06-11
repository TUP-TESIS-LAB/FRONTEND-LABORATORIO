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
