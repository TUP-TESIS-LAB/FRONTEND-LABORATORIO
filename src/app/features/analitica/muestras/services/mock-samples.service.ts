import { Injectable, Signal, computed, signal } from '@angular/core';
import type { Sample, SampleState } from '../models/sample.model';
import { SEED } from '../data/seed';

const STORAGE_KEY = 'muestras:samples:v1';

@Injectable({ providedIn: 'root' })
export class MockSamplesService {
  private readonly _samples = signal<Sample[]>([]);
  readonly samples = this._samples.asReadonly();

  private readonly _leavingIds = signal<ReadonlySet<string>>(new Set());
  readonly leavingIds = this._leavingIds.asReadonly();

  // cache de signals por estado para que computed no se cree cada llamada
  private readonly _byStateCache = new Map<SampleState, Signal<Sample[]>>();
  private readonly _countCache = new Map<SampleState, Signal<number>>();

  constructor() {
    this.loadFromStorage();
  }

  byState(state: SampleState): Signal<Sample[]> {
    let s = this._byStateCache.get(state);
    if (!s) {
      s = computed(() => this._samples().filter(x => x.state === state));
      this._byStateCache.set(state, s);
    }
    return s;
  }

  countByState(state: SampleState): Signal<number> {
    let s = this._countCache.get(state);
    if (!s) {
      const src = this.byState(state);
      s = computed(() => src().length);
      this._countCache.set(state, s);
    }
    return s;
  }

  resetToSeed(): void {
    this._samples.set([...SEED]);
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Sample[];
        if (Array.isArray(parsed) && parsed.every(s => typeof s.id === 'string' && typeof s.state === 'string')) {
          this._samples.set(parsed);
          return;
        }
      }
    } catch {
      // fallthrough → seed
    }
    this._samples.set([...SEED]);
  }
}
