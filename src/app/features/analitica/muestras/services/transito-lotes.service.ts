import { Injectable, computed, inject, signal } from '@angular/core';
import { MockSamplesService } from './mock-samples.service';
import type { RecommendedGroup, SendResult, TemporalLote, TransitoDest } from '../models/transito.model';
import type { Transition } from '../models/transition.model';
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

  async send(targetId: string, kind: 'group' | 'lote'): Promise<SendResult | null> {
    const container = kind === 'lote'
      ? this._lotes().find(l => l.id === targetId)
      : this.groups().find(g => g.id === targetId);
    if (!container) return null;

    const dest: TransitoDest = { branch: container.branch, area: container.area, section: container.section };
    if (!dest.branch || !dest.area || !dest.section) return null;

    const selected = this._sel();
    const inContainer = container.sampleIds;
    const idsToSend = inContainer.some(id => selected.has(id))
      ? inContainer.filter(id => selected.has(id))
      : inContainer;

    const loteRef = kind === 'lote' ? (container as TemporalLote) : null;
    const result = await this.dispatchSend(idsToSend, dest, loteRef);
    this.afterSendCleanup(idsToSend, targetId, kind);
    return result;
  }

  async sendAll(): Promise<{ enProceso: number; enTransito: number }> {
    const snapshot = this.groups();
    let enProceso = 0, enTransito = 0;
    for (const g of snapshot) {
      const dest: TransitoDest = { branch: g.branch, area: g.area, section: g.section };
      await this.dispatchSend(g.sampleIds, dest, null);
      if (dest.branch === CURRENT_BRANCH) enProceso += g.sampleIds.length;
      else enTransito += g.sampleIds.length;
      this._groupOverrides.update(map => {
        if (!map.has(g.id)) return map;
        const next = new Map(map);
        next.delete(g.id);
        return next;
      });
    }
    this.clearSel();
    return { enProceso, enTransito };
  }

  private async dispatchSend(ids: string[], dest: TransitoDest, lote: TemporalLote | null): Promise<SendResult> {
    if (ids.length === 0) return { enProceso: 0, enTransito: 0, detail: '' };
    this._leaving.update(set => {
      const next = new Set(set);
      for (const id of ids) next.add(id);
      return next;
    });

    const isHere = dest.branch === CURRENT_BRANCH;
    const transition: Transition = isHere
      ? { key: 'area', label: '', toLabel: 'En proceso', toState: 'processing', color: 'green', icon: '', desc: '', fields: ['areaFixed'] }
      : { key: 'reroute', label: '', toLabel: 'En tránsito', toState: 'transito', color: 'blue', icon: '', desc: '', fields: ['sucursal', 'area'] };

    const transitionDest = isHere
      ? { area: dest.area }
      : { sucursal: dest.branch, area: dest.area };

    await this.samplesService.transition(ids, transition, transitionDest);

    this._leaving.update(set => {
      const next = new Set(set);
      for (const id of ids) next.delete(id);
      return next;
    });

    const enProceso = isHere ? ids.length : 0;
    const enTransito = isHere ? 0 : ids.length;
    const loteSuffix = lote ? ` · Lote ${this._lotes().findIndex(l => l.id === lote.id) + 1}` : '';
    const detail = `${dest.branch} · ${dest.area} · ${dest.section}${loteSuffix}`;
    return { enProceso, enTransito, detail };
  }

  private afterSendCleanup(ids: string[], targetId: string, kind: 'group' | 'lote'): void {
    if (kind === 'lote') {
      this._lotes.update(arr => arr.map(l => {
        if (l.id !== targetId) return l;
        return { ...l, sampleIds: l.sampleIds.filter(id => !ids.includes(id)) };
      }).filter(l => l.sampleIds.length > 0));
      if (!this._lotes().some(l => l.id === targetId)) {
        if (this._activeLoteId() === targetId) {
          this._activeLoteId.set(this._lotes()[0]?.id ?? null);
        }
      }
    } else {
      this._groupOverrides.update(map => {
        if (!map.has(targetId)) return map;
        const next = new Map(map);
        next.delete(targetId);
        return next;
      });
      this._editing.update(set => {
        if (!set.has(targetId)) return set;
        const next = new Set(set);
        next.delete(targetId);
        return next;
      });
    }
    this.clearSel();
  }

  private removeIdsFromLotes(arr: TemporalLote[], ids: string[]): TemporalLote[] {
    const remove = new Set(ids);
    return arr
      .map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => !remove.has(id)) }))
      .filter(l => l.sampleIds.length > 0);
  }
}
