import { Injectable, Signal, computed, effect, signal, untracked } from '@angular/core';
import type { Sample, SampleState } from '../models/sample.model';
import type { Transition, TransitionDest } from '../models/transition.model';
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

  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private skipNextPersist = true;

  constructor() {
    this.loadFromStorage();
    effect(() => {
      const snapshot = this._samples();
      // saltar el primer run (carga inicial) para no persistir el seed antes de una mutación real
      untracked(() => {
        if (this.skipNextPersist) {
          this.skipNextPersist = false;
          return;
        }
        this.schedulePersist(snapshot);
      });
    });
  }

  private schedulePersist(samples: Sample[]): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
      } catch {
        // storage lleno o no disponible: silenciar (mock no crítico)
      }
      this.persistTimer = null;
    }, 100);
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

  async transition(ids: string[], target: Transition, dest: TransitionDest): Promise<void> {
    if (ids.length === 0) return;

    this._leavingIds.set(new Set(ids));
    await new Promise(resolve => setTimeout(resolve, 360));

    const idSet = new Set(ids);
    const next = this._samples().map(s => {
      if (!idSet.has(s.id)) return s;
      return this.applyTransition(s, target, dest);
    });
    this._samples.set(next);
    this._leavingIds.set(new Set());
  }

  private applyTransition(s: Sample, target: Transition, dest: TransitionDest): Sample {
    const base: Sample = { ...s, state: target.toState, destino: undefined, area: undefined };

    switch (target.key) {
      case 'transito':
        return { ...base, destino: 'Recepción central' };
      case 'area':
        return { ...base, area: dest.area };
      case 'reroute':
        return { ...base, destino: `${dest.sucursal ?? ''} · ${dest.area ?? ''}`.trim() };
      case 'derived':
        return { ...base, destino: dest.lab };
      default:
        // rejected, lost, completed, discard, rollback → solo cambia state
        return base;
    }
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
