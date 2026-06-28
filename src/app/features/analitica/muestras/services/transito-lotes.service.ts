import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import type {
  LoteDestPatch, RecommendedGroup, ScanResult, SectionOption, SendResult, TemporalLote, TransitoDest,
} from '../models/transito.model';
import { SIN_DESTINO_GROUP_ID } from '../models/transito.model';
import type { Tube } from '../models/tube.model';
import type { RoutingResolveResponse } from '../models/routing.model';
import { deriveTubes, dispatchTubes } from '../store/muestras.actions';

/** Texto user-friendly por motivo de no-resolución del routing. */
const REASON_TEXT: Record<string, string> = {
  NO_SECTION_CONFIGURED: 'El análisis no tiene sección configurada',
  NO_WORKSPACE_FOUND: 'La sucursal no tiene esa sección',
};

export const NO_SAMPLE_LINK_TEXT = 'Tubo sin vínculo — regeneralo desde la extracción';

/**
 * Orquestación de UI de la pantalla Tránsito: lotes temporales (localStorage),
 * grupos recomendados derivados del routing real de la mochila, selección y envío.
 * Los datos (tubos, routing, sucursales, secciones) entran por setters desde la página,
 * que los lee del store NgRx. Los envíos despachan acciones reales (dispatch/derive).
 */
@Injectable({ providedIn: 'root' })
export class TransitoLotesService {
  private readonly store = inject(Store);

  // ── Insumos provistos por la página (fuente: store NgRx) ──
  private readonly _tubes = signal<Tube[]>([]);
  private readonly _routing = signal<RoutingResolveResponse | null>(null);
  private readonly _branchName = signal('');
  private readonly _branchId = signal<number | null>(null);
  private readonly _myBranches = signal<{ id: number; name: string }[]>([]);
  private readonly _sectionOptions = signal<SectionOption[]>([]);

  setTubes(tubes: Tube[]): void { this._tubes.set(tubes); }
  setRouting(routing: RoutingResolveResponse | null): void { this._routing.set(routing); }
  setBranch(name: string, id: number | null): void { this._branchName.set(name); this._branchId.set(id); }
  setBranches(branches: { id: number; name: string }[]): void { this._myBranches.set(branches); }
  setSectionOptions(options: SectionOption[]): void { this._sectionOptions.set(options); }

  readonly sectionOptions = this._sectionOptions.asReadonly();
  readonly branchName = this._branchName.asReadonly();

  // ── Estado de UI ──
  private readonly _lotes = signal<TemporalLote[]>([]);

  private readonly _activeLoteId = signal<string | null>(null);
  readonly activeLoteId = this._activeLoteId.asReadonly();

  private readonly _sel = signal<ReadonlySet<string>>(new Set());
  readonly sel = this._sel.asReadonly();

  private readonly _editing = signal<ReadonlySet<string>>(new Set());
  readonly editing = this._editing.asReadonly();

  private readonly _leaving = signal<ReadonlySet<string>>(new Set());
  readonly leaving = this._leaving.asReadonly();

  /** Override de destino (display) por grupo: aplica al grupo `sin-destino` y a ediciones manuales. */
  private readonly _groupOverrides = signal<ReadonlyMap<string, TransitoDest>>(new Map());
  /** Sección real elegida manualmente por grupo (para el despacho). */
  private readonly _groupSectionIds = signal<ReadonlyMap<string, number>>(new Map());

  private readonly STORAGE_KEY = 'analitica.traslado.lotes';

  constructor() {
    this.rehydrate();
    effect(() => {
      const snapshot = this._lotes();
      untracked(() => {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
        } catch { /* silenciar */ }
      });
    });
    // _leaving es estado visual pendiente: se limpia cuando los tubos desaparecen de la lista.
    effect(() => {
      const tubeIds = new Set(this._tubes().map(t => t.id));
      untracked(() => {
        const leaving = this._leaving();
        if (leaving.size === 0) return;
        const still = [...leaving].filter(id => tubeIds.has(id));
        if (still.length !== leaving.size) this._leaving.set(new Set(still));
      });
    });
  }

  private rehydrate(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TemporalLote[];
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed.filter(l => l && typeof l.id === 'string' && Array.isArray(l.sampleIds));
      this._lotes.set(cleaned);
    } catch {
      // arranca vacío
    }
  }

  /** Vista de lotes con sampleIds filtrados a los tubos vigentes en tránsito. */
  readonly lotes = computed<TemporalLote[]>(() => {
    const tubeIds = new Set(this._tubes().map(t => t.id));
    return this._lotes().map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => tubeIds.has(id)) }));
  });

  private readonly lotedIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const l of this._lotes()) for (const id of l.sampleIds) ids.add(id);
    return ids;
  });

  private readonly tubesById = computed<ReadonlyMap<string, Tube>>(() => {
    const map = new Map<string, Tube>();
    for (const t of this._tubes()) map.set(t.id, t);
    return map;
  });

  private readonly tubesBySampleId = computed<ReadonlyMap<number, Tube>>(() => {
    const map = new Map<number, Tube>();
    for (const t of this._tubes()) if (t.sampleId != null) map.set(t.sampleId, t);
    return map;
  });

  /**
   * Grupos recomendados según el destino PRE-CALCULADO que la mochila propaga en cada tubo
   * (`tube.sectionId` + `tube.destinationBranchId`), no recalculado en vivo por el /resolve.
   * - Un grupo `ws-{sectionId}` por sección destino. Los tubos inter-sucursal (el back ahora
   *   los devuelve al worklist del origen) quedan agrupados por su sección destino real.
   * - El grupo se marca inter-sucursal si sus tubos traen `destinationBranchId != null && != branchId`.
   *   El branch del grupo muestra la sucursal destino (de `_myBranches`) en ese caso.
   * - Tubo sin `sectionId` → grupo `sin-destino` (resoluble por asignación manual).
   */
  readonly groups = computed<RecommendedGroup[]>(() => {
    const loted = this.lotedIds();
    const overrides = this._groupOverrides();
    const branchName = this._branchName();
    const branchId = this._branchId();
    const sectionById = new Map(this._sectionOptions().map(o => [o.sectionId, o]));
    const branchById = new Map(this._myBranches().map(b => [b.id, b.name]));

    const buckets = new Map<string, RecommendedGroup>();
    const rest: string[] = [];

    for (const tube of this._tubes()) {
      if (loted.has(tube.id)) continue;
      if (tube.sectionId == null) { rest.push(tube.id); continue; }

      const id = `ws-${tube.sectionId}`;
      let g = buckets.get(id);
      if (!g) {
        const ov = overrides.get(id);
        const opt = sectionById.get(tube.sectionId);
        const isOtherBranch = tube.destinationBranchId != null && tube.destinationBranchId !== branchId;
        const destBranchName = isOtherBranch
          ? (branchById.get(tube.destinationBranchId!) ?? opt?.branchName ?? `Sucursal ${tube.destinationBranchId}`)
          : branchName;
        g = {
          id,
          branch: ov?.branch ?? destBranchName,
          area: ov?.area ?? opt?.areaName ?? '',
          section: ov?.section ?? opt?.sectionName ?? `Sección ${tube.sectionId}`,
          sampleIds: [],
          destinationBranchId: isOtherBranch ? tube.destinationBranchId : null,
          isOtherBranch,
        };
        buckets.set(id, g);
      }
      g.sampleIds.push(tube.id);
    }

    const result = Array.from(buckets.values());
    if (rest.length > 0) {
      const ov = overrides.get(SIN_DESTINO_GROUP_ID);
      result.push({
        id: SIN_DESTINO_GROUP_ID,
        branch: ov?.branch ?? '',
        area: ov?.area ?? '',
        section: ov?.section ?? '',
        sampleIds: rest,
        destinationBranchId: null,
        isOtherBranch: false,
      });
    }
    return result;
  });

  /**
   * Motivo (texto en español) por tubo del grupo `sin-destino`.
   * La agrupación ya no depende del /resolve: un tubo cae en `sin-destino` cuando la mochila
   * no le pre-calculó sección (`tube.sectionId == null`). Si además no tiene vínculo
   * (`sampleId == null`) el motivo es el de tubo sin vínculo; si no, motivo genérico de asignación manual.
   * El /resolve aporta el detalle fino cuando está disponible (back que devuelve `unresolvable`).
   */
  readonly reasons = computed<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    const bySample = this.tubesBySampleId();
    for (const u of this._routing()?.unresolvable ?? []) {
      const tube = bySample.get(u.sampleId);
      if (!tube || tube.sectionId != null || map.has(tube.id)) continue;
      map.set(tube.id, REASON_TEXT[u.reason] ?? 'Sin destino calculado');
    }
    for (const t of this._tubes()) {
      if (t.sectionId != null || map.has(t.id)) continue;
      map.set(t.id, t.sampleId == null
        ? NO_SAMPLE_LINK_TEXT
        : 'Sin destino calculado — asigná una sección');
    }
    return map;
  });

  readonly stats = computed(() => ({
    total: this._tubes().length,
    groups: this.groups().length,
    lotes: this._lotes().length,
  }));

  /** Preview para el diálogo "Enviar todo": grupos local (despacho) e inter-sucursal (derivación). */
  readonly sendAllPreview = computed(() => {
    let enProceso = 0;
    let enTransito = 0;
    let omitidas = 0;
    let groupsCount = 0;
    const byId = this.tubesById();
    for (const g of this.groups()) {
      if (g.isOtherBranch && g.destinationBranchId != null) {
        groupsCount++;
        enTransito += g.sampleIds.length;
        continue;
      }
      const sectionId = this.sectionIdOf(g.id);
      if (sectionId == null) {
        omitidas += g.sampleIds.length;
        continue;
      }
      groupsCount++;
      for (const id of g.sampleIds) {
        const tube = byId.get(id);
        if (tube?.sampleId != null) enProceso++;
        else omitidas++;
      }
    }
    return { enProceso, enTransito, groupsCount, omitidas };
  });

  /** Sección efectiva de un grupo: asignación manual > la implícita en el id `ws-{sectionId}`. */
  sectionIdOf(groupId: string): number | null {
    const manual = this._groupSectionIds().get(groupId);
    if (manual != null) return manual;
    if (groupId.startsWith('ws-')) {
      const n = Number(groupId.slice(3));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /** Asignación manual de sección a un grupo (incluye `sin-destino`). */
  assignGroupSection(groupId: string, sectionId: number): void {
    const opt = this._sectionOptions().find(o => o.sectionId === sectionId);
    this._groupSectionIds.update(map => new Map(map).set(groupId, sectionId));
    this._groupOverrides.update(map => new Map(map).set(groupId, {
      branch: this._branchName(),
      area: opt?.areaName ?? '',
      section: opt?.sectionName ?? `Sección ${sectionId}`,
    }));
  }

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

  scan(code: string): ScanResult {
    const norm = code.trim().toLowerCase();
    if (!norm) return { matchedId: null, outcome: 'no-match' };
    const transito = this._tubes();
    // Tube.barcode es la concatenación de los barcodes de sus etiquetas: exacto por parte, luego parcial.
    const match = transito.find(t => t.barcode.toLowerCase().split(' ').includes(norm))
      ?? transito.find(t => t.barcode.toLowerCase().includes(norm));
    if (!match) return { matchedId: null, outcome: 'no-match' };

    const activeId = this._activeLoteId();
    if (activeId) {
      const active = this._lotes().find(l => l.id === activeId);
      if (active?.sampleIds.includes(match.id)) {
        const idx = this._lotes().findIndex(l => l.id === activeId);
        return { matchedId: match.id, outcome: 'duplicate', duplicateLoteNumber: idx + 1 };
      }
      this._lotes.update(arr => arr
        .map(l => {
          if (l.id === activeId) {
            return { ...l, sampleIds: [...l.sampleIds, match.id] };
          }
          const filtered = l.sampleIds.filter(id => id !== match.id);
          return { ...l, sampleIds: filtered };
        })
        .filter(l => l.id === activeId || l.sampleIds.length > 0),
      );
      this.clearSel();
      return { matchedId: match.id, outcome: 'added' };
    }

    this.createLote([match.id]);
    return { matchedId: match.id, outcome: 'added' };
  }

  updateDest(target: { kind: 'group' | 'lote'; id: string }, patch: LoteDestPatch): void {
    if (target.kind === 'lote') {
      this._lotes.update(arr => arr.map(l => l.id === target.id ? { ...l, ...patch } : l));
      return;
    }
    this._groupOverrides.update(map => {
      const next = new Map(map);
      const current = next.get(target.id) ?? { branch: '', area: '', section: '' };
      next.set(target.id, {
        branch: patch.branch ?? current.branch,
        area: patch.area ?? current.area,
        section: patch.section ?? current.section,
      });
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

  clearLeaving(): void { this._leaving.set(new Set()); }

  /**
   * Envía un grupo o lote contra el backend real:
   * - destino en esta sucursal → dispatchTubes (despacho atómico, requiere sectionId y sampleId).
   * - destino en otra sucursal (solo lotes) → deriveTubes (labels planos + destinationBranchId).
   * Devuelve null si el destino no está resuelto.
   */
  send(targetId: string, kind: 'group' | 'lote'): SendResult | null {
    return kind === 'lote' ? this.sendLote(targetId) : this.sendGroup(targetId);
  }

  /**
   * Envía todos los grupos recomendados resolubles:
   * - los locales en UN solo despacho atómico (dispatchTubes),
   * - cada grupo inter-sucursal en su propia derivación (deriveTubes, un destino por grupo).
   */
  sendAll(): { enProceso: number; enTransito: number; skipped: number } {
    const snapshot = this.groups();
    const checkIns: { sampleId: number; sectionId: number }[] = [];
    const leavingIds: string[] = [];
    const sentGroups: string[] = [];
    let skipped = 0;
    let enTransito = 0;

    for (const g of snapshot) {
      // Inter-sucursal: se deriva por separado (cada grupo tiene su sucursal destino).
      if (g.isOtherBranch && g.destinationBranchId != null) {
        const tubes = this.tubesByIds(g.sampleIds);
        const labelIds = tubes.flatMap(t => t.labelIds);
        if (labelIds.length === 0) continue;
        this.store.dispatch(deriveTubes({
          labelIds, destinationBranchId: g.destinationBranchId, tubeCount: tubes.length,
        }));
        this.markLeaving(tubes.map(t => t.id));
        this.cleanupGroup(g.id);
        enTransito += tubes.length;
        continue;
      }
      const sectionId = this.sectionIdOf(g.id);
      if (sectionId == null) continue; // sin-destino sin asignación manual: queda en pantalla
      for (const tube of this.tubesByIds(g.sampleIds)) {
        if (tube.sampleId == null) { skipped++; continue; }
        checkIns.push({ sampleId: tube.sampleId, sectionId });
        leavingIds.push(tube.id);
      }
      sentGroups.push(g.id);
    }

    if (checkIns.length > 0) {
      this.store.dispatch(dispatchTubes({ checkIns }));
      this.markLeaving(leavingIds);
      for (const id of sentGroups) this.cleanupGroup(id);
    }
    this.clearSel();
    return { enProceso: checkIns.length, enTransito, skipped };
  }

  private sendGroup(groupId: string): SendResult | null {
    const group = this.groups().find(g => g.id === groupId);
    if (!group) return null;

    const ids = this.idsToSend(group.sampleIds);
    const tubes = this.tubesByIds(ids);
    if (tubes.length === 0) return null;

    // Inter-sucursal: deriva (send-to-branch) con labels planos + destinationBranchId del grupo.
    const destinationBranchId = group.isOtherBranch ? (group.destinationBranchId ?? null) : null;
    if (destinationBranchId != null && destinationBranchId !== this._branchId()) {
      const labelIds = tubes.flatMap(t => t.labelIds);
      if (labelIds.length === 0) return null;
      this.store.dispatch(deriveTubes({ labelIds, destinationBranchId, tubeCount: tubes.length }));
      this.markLeaving(tubes.map(t => t.id));
      this.cleanupGroup(groupId);
      this.clearSel();
      return {
        enProceso: 0, enTransito: tubes.length, skipped: 0,
        detail: [group.branch, group.area, group.section].filter(Boolean).join(' · '),
      };
    }

    // Local: despacho atómico a la sección de esta sucursal.
    const sectionId = this.sectionIdOf(groupId);
    if (sectionId == null) return null;
    const dispatchable = tubes.filter(t => t.sampleId != null);
    const checkIns = dispatchable.map(t => ({ sampleId: t.sampleId!, sectionId }));
    const skipped = tubes.length - checkIns.length;

    if (checkIns.length > 0) {
      this.store.dispatch(dispatchTubes({ checkIns }));
      this.markLeaving(dispatchable.map(t => t.id));
      this.cleanupGroup(groupId);
    }
    this.clearSel();
    const branch = group.branch || this._branchName();
    return {
      enProceso: checkIns.length, enTransito: 0, skipped,
      detail: [branch, group.area, group.section].filter(Boolean).join(' · '),
    };
  }

  private sendLote(loteId: string): SendResult | null {
    const lote = this.lotes().find(l => l.id === loteId);
    if (!lote || !lote.branch) return null;
    const ids = this.idsToSend(lote.sampleIds);
    const tubes = this.tubesByIds(ids);
    if (tubes.length === 0) return null;

    const isHere = lote.branch === this._branchName();
    if (isHere) {
      const sectionId = lote.sectionId ?? null;
      if (sectionId == null) return null;
      const dispatchable = tubes.filter(t => t.sampleId != null);
      const checkIns = dispatchable.map(t => ({ sampleId: t.sampleId!, sectionId }));
      const skipped = tubes.length - checkIns.length;
      if (checkIns.length > 0) {
        this.store.dispatch(dispatchTubes({ checkIns }));
        this.markLeaving(dispatchable.map(t => t.id));
        this.removeFromLote(loteId, dispatchable.map(t => t.id));
      }
      this.clearSel();
      return {
        enProceso: checkIns.length, enTransito: 0, skipped,
        detail: [lote.branch, lote.area, lote.section].filter(Boolean).join(' · '),
      };
    }

    const destinationBranchId = lote.destinationBranchId
      ?? this._myBranches().find(b => b.name === lote.branch)?.id
      ?? null;
    if (destinationBranchId == null) return null;
    const labelIds = tubes.flatMap(t => t.labelIds);
    if (labelIds.length === 0) return null;

    this.store.dispatch(deriveTubes({
      labelIds,
      destinationBranchId,
      tubeCount: tubes.length,
      observation: lote.observation?.trim() || undefined,
    }));
    this.markLeaving(tubes.map(t => t.id));
    this.removeFromLote(loteId, tubes.map(t => t.id));
    this.clearSel();
    return { enProceso: 0, enTransito: tubes.length, skipped: 0, detail: lote.branch };
  }

  private idsToSend(containerIds: string[]): string[] {
    const selected = this._sel();
    return containerIds.some(id => selected.has(id))
      ? containerIds.filter(id => selected.has(id))
      : [...containerIds];
  }

  private tubesByIds(ids: string[]): Tube[] {
    const byId = this.tubesById();
    return ids.map(id => byId.get(id)).filter((t): t is Tube => !!t);
  }

  private markLeaving(ids: string[]): void {
    if (ids.length === 0) return;
    this._leaving.update(set => {
      const next = new Set(set);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  private cleanupGroup(groupId: string): void {
    this._groupOverrides.update(map => {
      if (!map.has(groupId)) return map;
      const next = new Map(map);
      next.delete(groupId);
      return next;
    });
    this._groupSectionIds.update(map => {
      if (!map.has(groupId)) return map;
      const next = new Map(map);
      next.delete(groupId);
      return next;
    });
    this._editing.update(set => {
      if (!set.has(groupId)) return set;
      const next = new Set(set);
      next.delete(groupId);
      return next;
    });
  }

  private removeFromLote(loteId: string, ids: string[]): void {
    this._lotes.update(arr => arr.map(l => {
      if (l.id !== loteId) return l;
      return { ...l, sampleIds: l.sampleIds.filter(id => !ids.includes(id)) };
    }).filter(l => l.sampleIds.length > 0));
    if (!this._lotes().some(l => l.id === loteId) && this._activeLoteId() === loteId) {
      this._activeLoteId.set(this._lotes()[0]?.id ?? null);
    }
  }

  private removeIdsFromLotes(arr: TemporalLote[], ids: string[]): TemporalLote[] {
    const remove = new Set(ids);
    return arr
      .map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => !remove.has(id)) }))
      .filter(l => l.sampleIds.length > 0);
  }
}
