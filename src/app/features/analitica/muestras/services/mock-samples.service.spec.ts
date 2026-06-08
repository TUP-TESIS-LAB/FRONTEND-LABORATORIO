import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MockSamplesService } from './mock-samples.service';

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

describe('MockSamplesService', () => {
  let lsStore: Map<string, string>;

  beforeEach(() => {
    lsStore = installLocalStorageMock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService] });
  });

  it('al inicializar sin storage, carga el SEED y persiste', () => {
    const svc = TestBed.inject(MockSamplesService);
    expect(svc.samples().length).toBeGreaterThan(0);
    // SEED tiene 16 en collected
    expect(svc.byState('collected')().length).toBe(16);
  });

  it('byState filtra correctamente por cada estado', () => {
    const svc = TestBed.inject(MockSamplesService);
    expect(svc.byState('collected')().length).toBe(16);
    expect(svc.byState('transito')().length).toBe(10);
    expect(svc.byState('processing')().length).toBe(9);
    expect(svc.byState('completed')().length).toBe(7);
    expect(svc.byState('discarded')().length).toBe(0);
  });

  it('countByState devuelve el count correcto', () => {
    const svc = TestBed.inject(MockSamplesService);
    expect(svc.countByState('collected')()).toBe(16);
    expect(svc.countByState('transito')()).toBe(10);
  });
});
