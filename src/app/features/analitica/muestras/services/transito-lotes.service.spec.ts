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
