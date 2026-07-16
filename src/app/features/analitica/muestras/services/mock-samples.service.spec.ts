import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
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

  it('transition con target "transito" (Recolección → Traslado) mueve N muestras y marca leavingIds momentáneamente', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const ids = svc.byState('collected')().slice(0, 3).map(s => s.id);
    const target = {
      key: 'transito' as const, label: 'En tránsito', toLabel: 'En tránsito', toState: 'transito' as const,
      color: 'green' as const, icon: 'pi-truck', desc: '', fields: [],
    };

    const p = svc.transition(ids, target, {});
    expect(svc.leavingIds().size).toBe(3);

    await vi.advanceTimersByTimeAsync(360);
    await p;

    expect(svc.leavingIds().size).toBe(0);
    expect(svc.byState('collected')().length).toBe(13);
    expect(svc.byState('transito')().filter(s => ids.includes(s.id))
      .every(s => s.destino === 'Recepción central')).toBe(true);
    vi.useRealTimers();
  });

  it('transition con target "area" pasa de transito a processing con area seteada', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const id = svc.byState('transito')()[0].id;
    const target = {
      key: 'area' as const, label: 'Asignar a área', toLabel: 'En proceso', toState: 'processing' as const,
      color: 'green' as const, icon: 'pi-inbox', desc: '', fields: ['areaFixed' as const],
    };

    const p = svc.transition([id], target, { area: 'Hematología' });
    await vi.advanceTimersByTimeAsync(360);
    await p;

    const moved = svc.samples().find(s => s.id === id)!;
    expect(moved.state).toBe('processing');
    expect(moved.area).toBe('Hematología');
    expect(moved.destino).toBeUndefined();
    vi.useRealTimers();
  });

  it('transition con target "reroute" setea destino con sucursal + area', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const id = svc.byState('transito')()[0].id;
    const target = {
      key: 'reroute' as const, label: 'Trasladar', toLabel: 'En tránsito', toState: 'transito' as const,
      color: 'blue' as const, icon: 'pi-truck', desc: '', fields: ['sucursal' as const, 'area' as const],
    };

    const p = svc.transition([id], target, { sucursal: 'NORTE — Belgrano', area: 'Inmunología' });
    await vi.advanceTimersByTimeAsync(360);
    await p;

    const moved = svc.samples().find(s => s.id === id)!;
    expect(moved.state).toBe('transito');
    expect(moved.destino).toBe('NORTE — Belgrano · Inmunología');
    vi.useRealTimers();
  });

  it('transition con target "derived" setea destino con lab', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const id = svc.byState('transito')()[0].id;
    const target = {
      key: 'derived' as const, label: 'Derivar', toLabel: 'Derivada', toState: 'derived' as const,
      color: 'purple' as const, icon: 'pi-building', desc: '', fields: ['lab' as const],
    };

    const p = svc.transition([id], target, { lab: 'CIBIC — Alta complejidad' });
    await vi.advanceTimersByTimeAsync(360);
    await p;

    const moved = svc.samples().find(s => s.id === id)!;
    expect(moved.state).toBe('derived');
    expect(moved.destino).toBe('CIBIC — Alta complejidad');
    vi.useRealTimers();
  });

  it('transition con rollback limpia destino y area', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const id = svc.byState('processing')()[0].id;
    const target = {
      key: 'rollback' as const, label: 'Volver', toLabel: 'En tránsito', toState: 'transito' as const,
      color: 'slate' as const, icon: 'pi-undo', desc: '', fields: [],
    };

    const p = svc.transition([id], target, {});
    await vi.advanceTimersByTimeAsync(360);
    await p;

    const moved = svc.samples().find(s => s.id === id)!;
    expect(moved.state).toBe('transito');
    expect(moved.area).toBeUndefined();
    expect(moved.destino).toBeUndefined();
    vi.useRealTimers();
  });

  it('persiste cambios en localStorage tras debounce', async () => {
    vi.useFakeTimers();
    const svc = TestBed.inject(MockSamplesService);
    const ids = svc.byState('collected')().slice(0, 2).map(s => s.id);
    const target = {
      key: 'transito' as const, label: '', toLabel: '', toState: 'transito' as const,
      color: 'green' as const, icon: '', desc: '', fields: [],
    };
    const p = svc.transition(ids, target, {});
    await vi.advanceTimersByTimeAsync(360);
    await p;

    // antes del debounce
    expect(lsStore.has('muestras:samples:v1')).toBe(false);
    await vi.advanceTimersByTimeAsync(150);

    expect(lsStore.has('muestras:samples:v1')).toBe(true);
    const persisted = JSON.parse(lsStore.get('muestras:samples:v1')!) as Sample[];
    expect(persisted.find(s => s.id === ids[0])!.state).toBe('transito');
    vi.useRealTimers();
  });

  it('al inicializar con storage previo válido, lo usa en lugar del seed', () => {
    const seedOverride: Sample[] = [{
      id: 'x-1', barcode: 'XX-0001', study: 'X', patient: 'X', branch: 'X',
      receivedAt: '2026-01-01T00:00:00Z', urgent: false, state: 'collected',
    }];
    lsStore.set('muestras:samples:v1', JSON.stringify(seedOverride));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService] });

    const svc = TestBed.inject(MockSamplesService);
    expect(svc.samples().length).toBe(1);
    expect(svc.samples()[0].id).toBe('x-1');
  });

  it('si storage tiene JSON inválido, fallback a seed', () => {
    lsStore.set('muestras:samples:v1', '{not json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockSamplesService] });
    const svc = TestBed.inject(MockSamplesService);
    expect(svc.samples().length).toBe(42);
  });
});
