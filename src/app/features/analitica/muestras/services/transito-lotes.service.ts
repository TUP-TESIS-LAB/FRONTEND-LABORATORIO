import { Injectable, computed, inject, signal } from '@angular/core';
import { MockSamplesService } from './mock-samples.service';
import type { RecommendedGroup, TemporalLote, TransitoDest } from '../models/transito.model';
import {
  AREA_BRANCH, AREA_SECTION, STUDY_AREA, CURRENT_BRANCH, DEFAULT_AREA,
} from '../data/catalogs';

@Injectable({ providedIn: 'root' })
export class TransitoLotesService {
  private readonly samplesService = inject(MockSamplesService);

  private readonly _lotes = signal<TemporalLote[]>([]);
  readonly lotes = this._lotes.asReadonly();

  private readonly _activeLoteId = signal<string | null>(null);
  readonly activeLoteId = this._activeLoteId.asReadonly();

  private readonly _sel = signal<ReadonlySet<string>>(new Set());
  readonly sel = this._sel.asReadonly();

  private readonly _editing = signal<ReadonlySet<string>>(new Set());
  readonly editing = this._editing.asReadonly();

  private readonly _leaving = signal<ReadonlySet<string>>(new Set());
  readonly leaving = this._leaving.asReadonly();

  private readonly _groupOverrides = signal<ReadonlyMap<string, TransitoDest>>(new Map());

  private readonly samplesInTransito = this.samplesService.byState('transito');

  private readonly lotedIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const l of this._lotes()) for (const id of l.sampleIds) ids.add(id);
    return ids;
  });

  readonly groups = computed(() => {
    const samples = this.samplesInTransito();
    const loted = this.lotedIds();
    const overrides = this._groupOverrides();
    const buckets = new Map<string, RecommendedGroup>();

    for (const s of samples) {
      if (loted.has(s.id)) continue;
      const area = STUDY_AREA[s.study] ?? DEFAULT_AREA;
      const branch = AREA_BRANCH[area] ?? CURRENT_BRANCH;
      const section = AREA_SECTION[area] ?? 'Mesada manual';
      const baseKey = `${branch}|${area}|${section}`;
      const ov = overrides.get(baseKey);
      const realBranch = ov?.branch ?? branch;
      const realArea = ov?.area ?? area;
      const realSection = ov?.section ?? section;
      const id = `${realBranch}|${realArea}|${realSection}`;
      let g = buckets.get(id);
      if (!g) {
        g = { id, branch: realBranch, area: realArea, section: realSection, sampleIds: [] };
        buckets.set(id, g);
      }
      g.sampleIds.push(s.id);
    }

    const arr = Array.from(buckets.values());
    arr.sort((a, b) => {
      const aHere = a.branch === CURRENT_BRANCH ? 0 : 1;
      const bHere = b.branch === CURRENT_BRANCH ? 0 : 1;
      if (aHere !== bHere) return aHere - bHere;
      return a.area.localeCompare(b.area);
    });
    return arr;
  });

  readonly stats = computed(() => ({
    total: this.samplesInTransito().length,
    groups: this.groups().length,
    lotes: this._lotes().length,
  }));

  toggleSel(id: string): void {
    this._sel.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleSelMany(ids: string[], on: boolean): void {
    this._sel.update(set => {
      const next = new Set(set);
      for (const id of ids) on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  clearSel(): void { this._sel.set(new Set()); }

  createLote(ids: string[]): string {
    const id = crypto.randomUUID();
    this._lotes.update(arr => {
      const cleaned = this.removeIdsFromLotes(arr, ids);
      const lote: TemporalLote = {
        id, sampleIds: [...ids], branch: '', area: '', section: '', createdAt: Date.now(),
      };
      return [...cleaned, lote];
    });
    this._activeLoteId.set(id);
    this.clearSel();
    return id;
  }

  addToLote(loteId: string, ids: string[]): void {
    this._lotes.update(arr => {
      const cleaned = this.removeIdsFromLotes(arr, ids);
      return cleaned.map(l => {
        if (l.id !== loteId) return l;
        const existing = new Set(l.sampleIds);
        const merged = [...l.sampleIds];
        for (const id of ids) if (!existing.has(id)) merged.push(id);
        return { ...l, sampleIds: merged };
      });
    });
    this.clearSel();
  }

  dissolveLote(loteId: string): void {
    this._lotes.update(arr => arr.filter(l => l.id !== loteId));
    if (this._activeLoteId() === loteId) {
      const next = this._lotes()[0]?.id ?? null;
      this._activeLoteId.set(next);
    }
  }

  setActiveLote(loteId: string | null): void {
    this._activeLoteId.set(loteId);
  }

  updateDest(target: { kind: 'group' | 'lote'; id: string }, patch: Partial<TransitoDest>): void {
    if (target.kind === 'lote') {
      this._lotes.update(arr => arr.map(l => l.id === target.id ? { ...l, ...patch } : l));
      return;
    }
    this._groupOverrides.update(map => {
      const next = new Map(map);
      const current = next.get(target.id) ?? { branch: '', area: '', section: '' };
      next.set(target.id, { ...current, ...patch });
      return next;
    });
  }

  toggleEditing(targetId: string): void {
    this._editing.update(set => {
      const next = new Set(set);
      if (next.has(targetId)) next.delete(targetId); else next.add(targetId);
      return next;
    });
  }

  private removeIdsFromLotes(arr: TemporalLote[], ids: string[]): TemporalLote[] {
    const remove = new Set(ids);
    return arr
      .map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => !remove.has(id)) }))
      .filter(l => l.sampleIds.length > 0);
  }
}
