# Pantalla Tránsito — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el mount de `/analitica/traslado` por una pantalla dedicada con groups recomendados, lotes temporales con persistencia localStorage, scan a lote activo y modal de Enviar todo, según el handoff `design_handoff_traslado_angular`.

**Architecture:** Page-component que orquesta + `TransitoLotesService` con signals para todo el estado e invariantes. Componentes presentacionales standalone con OnPush. Datos desde `MockSamplesService` (mocks). Persistencia en localStorage para lotes; group-overrides solo en memoria.

**Tech Stack:** Angular 21 standalone components, signals, PrimeNG (toast + dialog), Vitest + `ng test`, SCSS con tokens privados de la pantalla.

**Spec:** `docs/superpowers/specs/2026-06-10-transito-pantalla-design.md`
**Jira:** _(pendiente — se agrega tras `jira-workflow`)_

---

## Task 1: Extender catalogs.ts con SECTIONS + mapas de la mochila

**Files:**
- Modify: `src/app/features/analitica/muestras/data/catalogs.ts`
- Test: `src/app/features/analitica/muestras/data/catalogs.spec.ts` (NUEVO)

- [ ] **Step 1: Crear el test de los nuevos exports**

```ts
// src/app/features/analitica/muestras/data/catalogs.spec.ts
import { describe, it, expect } from 'vitest';
import { STUDIES, SECTIONS, STUDY_AREA, AREA_SECTION, AREA_BRANCH, AREAS, BRANCHES } from './catalogs';

describe('catalogs — extensión Tránsito', () => {
  it('SECTIONS tiene las 11 secciones del handoff', () => {
    expect(SECTIONS).toContain('Autoanalizador A1');
    expect(SECTIONS).toContain('Citometría');
    expect(SECTIONS).toContain('Guardia / Urgencias');
    expect(SECTIONS.length).toBe(11);
  });

  it('STUDY_AREA cubre cada estudio listado en STUDIES', () => {
    for (const s of STUDIES) {
      expect(STUDY_AREA[s], `estudio sin mapeo a área: ${s}`).toBeDefined();
    }
  });

  it('AREA_SECTION cubre cada área usada en STUDY_AREA', () => {
    const usedAreas = new Set(Object.values(STUDY_AREA));
    for (const a of usedAreas) {
      expect(AREA_SECTION[a], `área sin sección default: ${a}`).toBeDefined();
    }
  });

  it('AREA_BRANCH cubre cada área usada en STUDY_AREA', () => {
    const usedAreas = new Set(Object.values(STUDY_AREA));
    for (const a of usedAreas) {
      expect(AREA_BRANCH[a], `área sin sucursal de procesamiento: ${a}`).toBeDefined();
    }
  });

  it('los valores de AREA_BRANCH están en BRANCHES y AREA_SECTION en SECTIONS', () => {
    for (const b of Object.values(AREA_BRANCH)) expect(BRANCHES).toContain(b);
    for (const s of Object.values(AREA_SECTION)) expect(SECTIONS).toContain(s);
  });

  it('STUDIES fusiona los del worklist con los del handoff sin duplicar', () => {
    const set = new Set(STUDIES);
    expect(set.size).toBe(STUDIES.length);
    expect(STUDIES).toContain('Hemograma completo'); // del worklist
    expect(STUDIES).toContain('TSH');                // del handoff
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=catalogs`
Expected: FAIL ("SECTIONS is not exported", etc.).

- [ ] **Step 3: Extender catalogs.ts con SECTIONS + 3 mapas + STUDIES fusionado**

Reemplazar el contenido actual de `STUDIES` y agregar todo lo siguiente al final del archivo:

```ts
// STUDIES fusionado: worklist actuales + 16 del handoff (sin duplicar)
export const STUDIES: ReadonlyArray<string> = [
  // del worklist actual
  'Hemograma completo',
  'Perfil tiroideo (TSH/T3/T4)',
  'Glucemia + HbA1c',
  'Perfil lipídico',
  'Función hepática',
  'Función renal',
  'Coagulograma',
  'Orina completa',
  'PCR cuantitativa',
  'Vitamina D',
  'Ferritina',
  'Test de embarazo',
  // del handoff (los que no se solapaban)
  'Glucemia',
  'Hepatograma',
  'TSH',
  'Urocultivo',
  'Ionograma plasmático',
  'Vitamina D (25-OH)',
  'Hemoglobina glicosilada',
  'Proteína C reactiva',
  'Creatinina',
  'Urea',
  'Serología Hepatitis B',
];

// NUEVO — secciones de laboratorio (handoff)
export const SECTIONS: ReadonlyArray<string> = [
  'Autoanalizador A1',
  'Autoanalizador A2',
  'Mesada manual',
  'Citometría',
  'Microscopía',
  'Inmunoensayo',
  'Cultivos',
  'Coagulómetro',
  'Sedimento',
  'PCR / NAT',
  'Guardia / Urgencias',
];

// NUEVO — mochila: study → area
export const STUDY_AREA: Readonly<Record<string, string>> = {
  'Hemograma completo': 'Hematología',
  'Perfil tiroideo (TSH/T3/T4)': 'Endocrinología',
  'Glucemia + HbA1c': 'Química clínica',
  'Perfil lipídico': 'Química clínica',
  'Función hepática': 'Química clínica',
  'Función renal': 'Química clínica',
  'Coagulograma': 'Coagulación',
  'Orina completa': 'Uroanálisis',
  'PCR cuantitativa': 'Inmunología',
  'Vitamina D': 'Endocrinología',
  'Ferritina': 'Inmunología',
  'Test de embarazo': 'Química clínica',
  'Glucemia': 'Química clínica',
  'Hepatograma': 'Química clínica',
  'TSH': 'Endocrinología',
  'Urocultivo': 'Microbiología',
  'Ionograma plasmático': 'Química clínica',
  'Vitamina D (25-OH)': 'Endocrinología',
  'Hemoglobina glicosilada': 'Química clínica',
  'Proteína C reactiva': 'Inmunología',
  'Creatinina': 'Química clínica',
  'Urea': 'Química clínica',
  'Serología Hepatitis B': 'Biología molecular',
};

// NUEVO — área → sección default
export const AREA_SECTION: Readonly<Record<string, string>> = {
  'Hematología': 'Citometría',
  'Química clínica': 'Autoanalizador A1',
  'Endocrinología': 'Inmunoensayo',
  'Microbiología': 'Cultivos',
  'Inmunología': 'Mesada manual',
  'Coagulación': 'Coagulómetro',
  'Uroanálisis': 'Sedimento',
  'Biología molecular': 'PCR / NAT',
};

// NUEVO — área → sucursal que procesa (clave del ruteo)
export const AREA_BRANCH: Readonly<Record<string, string>> = {
  'Hematología': 'CENTRAL — Sede Central',
  'Química clínica': 'CENTRAL — Sede Central',
  'Endocrinología': 'NORTE — Belgrano',
  'Microbiología': 'OESTE — Morón',
  'Inmunología': 'CENTRAL — Sede Central',
  'Coagulación': 'CENTRAL — Sede Central',
  'Uroanálisis': 'CENTRAL — Sede Central',
  'Biología molecular': 'SUR — Lanús',
};

// Fallback defensivo para muestras con estudios fuera del mapa
export const DEFAULT_AREA = 'Química clínica';
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=catalogs`
Expected: PASS (6 tests).

- [ ] **Step 5: Correr el full suite para confirmar que no rompimos worklist**

Run: `npm test -- --run`
Expected: todos los tests pasan (los del worklist usan STUDIES y siguen funcionando).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/muestras/data/catalogs.ts src/app/features/analitica/muestras/data/catalogs.spec.ts
git commit -m "feat(muestras): extiende catalogs con SECTIONS + mapas de la mochila"
```

---

## Task 2: Crear modelo `transito.model.ts`

**Files:**
- Create: `src/app/features/analitica/muestras/models/transito.model.ts`

- [ ] **Step 1: Escribir el archivo de modelo**

```ts
// src/app/features/analitica/muestras/models/transito.model.ts
export interface TransitoDest {
  branch: string;
  area: string;
  section: string;
}

export interface RecommendedGroup {
  /** Estable: `${branch}|${area}|${section}` */
  id: string;
  branch: string;
  area: string;
  section: string;
  sampleIds: string[];
}

export interface TemporalLote {
  /** crypto.randomUUID(). NO es el "Lote N" visible. */
  id: string;
  sampleIds: string[];
  /** '' = sin asignar */
  branch: string;
  area: string;
  section: string;
  /** epoch ms */
  createdAt: number;
}

export type SendOutcome = 'en-proceso' | 'en-transito';

export interface SendResult {
  enProceso: number;
  enTransito: number;
  /** "SUCURSAL · Área · Sección [· Lote N]" — para el detail del toast */
  detail: string;
}

export interface ScanResult {
  matchedId: string | null;
  outcome: 'added' | 'duplicate' | 'no-match';
  /** Si outcome='duplicate', el index+1 del lote donde estaba */
  duplicateLoteNumber?: number;
}
```

- [ ] **Step 2: Compilar para asegurar que no rompe nada**

Run: `npm run build -- --configuration=development`
Expected: build exitosa (el modelo solo se referencia desde tasks siguientes).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/muestras/models/transito.model.ts
git commit -m "feat(muestras): tipos RecommendedGroup, TemporalLote, SendResult, ScanResult"
```

---

## Task 3: `TransitoLotesService` — esqueleto + selección + `groups` derivado

**Files:**
- Create: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Test: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Crear el test del derivado `groups` y de selección**

```ts
// src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
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
    // El seed por default tiene N samples en tránsito; nos basta con saber que groups() es un array y los IDs son únicos
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar el service (parte 1: selección + groups + stats)**

```ts
// src/app/features/analitica/muestras/services/transito-lotes.service.ts
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { MockSamplesService } from './mock-samples.service';
import type { Sample } from '../models/sample.model';
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

  readonly groups: Signal<RecommendedGroup[]> = computed(() => {
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
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): TransitoLotesService — selección, groups derivado, stats"
```

---

## Task 4: Lotes — crear, agregar, descartar (invariante 1 y 4)

**Files:**
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Agregar tests de createLote/addToLote/dissolveLote**

Agregar al final del `describe`:

```ts
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
    expect(svc.lotes().find(l => l.id === b)!.sampleIds).not.toContain(ids[2]);
    // sin duplicado dentro de a
    const arr = svc.lotes().find(l => l.id === a)!.sampleIds;
    expect(new Set(arr).size).toBe(arr.length);
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL (`createLote is not a function`).

- [ ] **Step 3: Implementar createLote / addToLote / dissolveLote / setActiveLote**

Agregar al `TransitoLotesService`:

```ts
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

  private removeIdsFromLotes(arr: TemporalLote[], ids: string[]): TemporalLote[] {
    const remove = new Set(ids);
    return arr
      .map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => !remove.has(id)) }))
      .filter(l => l.sampleIds.length > 0);
  }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): createLote/addToLote/dissolveLote con invariante 1"
```

---

## Task 5: `updateDest` + `toggleEditing` (group overrides)

**Files:**
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Agregar tests**

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `updateDest` + `toggleEditing`**

```ts
  updateDest(target: { kind: 'group' | 'lote'; id: string }, patch: Partial<TransitoDest>): void {
    if (target.kind === 'lote') {
      this._lotes.update(arr => arr.map(l => l.id === target.id ? { ...l, ...patch } : l));
      return;
    }
    // group override: usamos la id base como key (la id del group hoy)
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): updateDest + toggleEditing con group overrides"
```

---

## Task 6: `send` (parcial / total / outcome) y `sendAll`

**Files:**
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Agregar tests**

```ts
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
    // el lote sigue existiendo intacto
    expect(svc.lotes().find(l => l.id === id)).toBeDefined();
  });

  it('send con tildes parciales envía solo las tildadas (invariante 5)', async () => {
    vi.useFakeTimers();
    const group = svc.groups()[0];
    const all = group.sampleIds;
    expect(all.length).toBeGreaterThanOrEqual(2);

    svc.toggleSelMany([all[0]], true);

    const beforeCount = samples.byState('transito')().length;
    const promise = svc.send(group.id, 'group');
    await vi.advanceTimersByTimeAsync(360);
    const result = await promise;

    expect(result).not.toBeNull();
    const afterCount = samples.byState('transito')().length;
    // solo 1 muestra salió de tránsito
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
    if (!here) return; // tolerante a seed sin matches
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
    await vi.advanceTimersByTimeAsync(360);
    const result = await promise;

    expect(result.enProceso + result.enTransito).toBe(totalGroupsBefore);
    expect(svc.lotes().find(l => l.id === loteId)).toBeDefined();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `send` y `sendAll`**

```ts
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

    const result = await this.dispatchSend(idsToSend, dest, kind === 'lote' ? container as TemporalLote : null);
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
    const transition = isHere
      ? { key: 'area' as const, label: '', toLabel: 'En proceso', toState: 'processing' as const, color: 'green' as const, icon: '', desc: '', fields: ['areaFixed' as const] }
      : { key: 'reroute' as const, label: '', toLabel: 'En tránsito', toState: 'transito' as const, color: 'blue' as const, icon: '', desc: '', fields: ['sucursal' as const, 'area' as const] };

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
      // si el lote dejó de existir, recalcular activeLote
      if (!this._lotes().some(l => l.id === targetId)) {
        if (this._activeLoteId() === targetId) {
          this._activeLoteId.set(this._lotes()[0]?.id ?? null);
        }
      }
    } else {
      // group: limpiar override y editing
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
```

Importar `CURRENT_BRANCH`, `SendResult` y agregar el constructor de `Transition` mediante import:

```ts
import { CURRENT_BRANCH } from '../data/catalogs';
import type { SendResult } from '../models/transito.model';
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): send parcial/total + outcome + sendAll"
```

---

## Task 7: `scan` con 3 outcomes

**Files:**
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Agregar tests**

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `scan`**

```ts
  scan(code: string): ScanResult {
    const norm = code.trim().toLowerCase();
    if (!norm) return { matchedId: null, outcome: 'no-match' };
    const transito = this.samplesInTransito();
    const match = transito.find(s => s.barcode.toLowerCase() === norm)
      ?? transito.find(s => s.barcode.toLowerCase().includes(norm));
    if (!match) return { matchedId: null, outcome: 'no-match' };

    const activeId = this._activeLoteId();
    if (activeId) {
      const active = this._lotes().find(l => l.id === activeId);
      if (active?.sampleIds.includes(match.id)) {
        const idx = this._lotes().findIndex(l => l.id === activeId);
        return { matchedId: match.id, outcome: 'duplicate', duplicateLoteNumber: idx + 1 };
      }
      this.addToLote(activeId, [match.id]);
      return { matchedId: match.id, outcome: 'added' };
    }

    // no hay lote activo → crear uno y agregar
    this.createLote([match.id]);
    return { matchedId: match.id, outcome: 'added' };
  }
```

Importar el tipo `ScanResult`:

```ts
import type { RecommendedGroup, ScanResult, SendResult, TemporalLote, TransitoDest } from '../models/transito.model';
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): scan con 3 outcomes (added/duplicate/no-match)"
```

---

## Task 8: localStorage — persistencia + rehidratación

**Files:**
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.ts`
- Modify: `src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts`

- [ ] **Step 1: Agregar tests**

```ts
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
    const raw = lsStore.get('analitica.traslado.lotes');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].sampleIds).toEqual(ids);
  });

  it('rehidrata lotes válidos del storage', () => {
    // primero, generar storage con un service y obtener un ID real de tránsito
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: FAIL (no se persiste, no se rehidrata).

- [ ] **Step 3: Agregar persistencia + rehidratación al service**

En el constructor del service:

```ts
  private readonly STORAGE_KEY = 'analitica.traslado.lotes';
  private skipNextPersist = true;

  constructor() {
    this.rehydrate();
    effect(() => {
      const snapshot = this._lotes();
      untracked(() => {
        if (this.skipNextPersist) {
          this.skipNextPersist = false;
          return;
        }
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
        } catch { /* silenciar */ }
      });
    });
  }

  private rehydrate(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TemporalLote[];
      if (!Array.isArray(parsed)) return;
      const samplesInTransitoIds = new Set(this.samplesInTransito().map(s => s.id));
      const cleaned = parsed
        .filter(l => l && typeof l.id === 'string' && Array.isArray(l.sampleIds))
        .map(l => ({ ...l, sampleIds: l.sampleIds.filter(id => samplesInTransitoIds.has(id)) }))
        .filter(l => l.sampleIds.length > 0);
      this._lotes.set(cleaned);
    } catch {
      // arranca vacío
    }
  }
```

Importar `effect`, `untracked`:

```ts
import { Injectable, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=transito-lotes.service`
Expected: PASS (todos los tests del service).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/services/transito-lotes.service.ts src/app/features/analitica/muestras/services/transito-lotes.service.spec.ts
git commit -m "feat(transito): persistencia localStorage + rehidratación filtrada"
```

---

## Task 9: Cambiar ruta `/traslado` para apuntar al nuevo page (stub)

**Files:**
- Create: `src/app/features/analitica/muestras/pages/transito/transito.page.ts`
- Create: `src/app/features/analitica/muestras/pages/transito/transito.page.html`
- Create: `src/app/features/analitica/muestras/pages/transito/transito.page.scss`
- Modify: `src/app/features/analitica/analitica.routes.ts:42-48`

- [ ] **Step 1: Crear stub mínimo del page**

```ts
// src/app/features/analitica/muestras/pages/transito/transito.page.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TransitoLotesService } from '../../services/transito-lotes.service';

@Component({
  selector: 'app-transito-page',
  standalone: true,
  templateUrl: './transito.page.html',
  styleUrl: './transito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoPage {
  protected readonly service = inject(TransitoLotesService);
}
```

```html
<!-- src/app/features/analitica/muestras/pages/transito/transito.page.html -->
<section class="transito-page">
  <h1>Muestras en tránsito</h1>
  <p>Stub — implementación completa en tasks siguientes.</p>
  <p>Stats: total={{ service.stats().total }} · groups={{ service.stats().groups }} · lotes={{ service.stats().lotes }}</p>
</section>
```

```scss
/* src/app/features/analitica/muestras/pages/transito/transito.page.scss */
.transito-page {
  padding: 24px 30px;
  font-family: system-ui;
}
```

- [ ] **Step 2: Cambiar la ruta**

En `src/app/features/analitica/analitica.routes.ts`, reemplazar el bloque del path `traslado`:

```ts
      {
        path: 'traslado',
        canMatch: [sectionGuard('PREANALITICA')],
        loadComponent: () => import('./muestras/pages/transito/transito.page').then(m => m.TransitoPage),
        data: { breadcrumb: 'Tránsito' },
        title: 'Tránsito',
      },
```

- [ ] **Step 3: Build para verificar**

Run: `npm run build -- --configuration=development`
Expected: build exitosa.

- [ ] **Step 4: Levantar el dev server y abrir /analitica/traslado**

Run (manual): el dev server ya debería estar corriendo en `:4200`. Navegar a `http://localhost:4200/analitica/traslado` y verificar que se ve el stub con stats reales.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/pages/transito/ src/app/features/analitica/analitica.routes.ts
git commit -m "feat(transito): ruta /traslado apunta al TransitoPage stub"
```

---

## Task 10: Tokens + Google Fonts + layout base de la pantalla

**Files:**
- Create: `src/app/features/analitica/muestras/pages/transito/_tokens.scss`
- Modify: `src/app/features/analitica/muestras/pages/transito/transito.page.scss`
- Modify: `src/index.html`

- [ ] **Step 1: Crear `_tokens.scss` con todas las variables del handoff**

```scss
// src/app/features/analitica/muestras/pages/transito/_tokens.scss
:host, .transito-page {
  --gx-brand: #4b4ddb;
  --gx-brand-hover: #3a3cc0;
  --gx-bg: #f5f6f9;
  --gx-card-bg: #ffffff;
  --gx-ink: #22243a;
  --gx-ink-2: #4a4d63;
  --gx-muted: #7c8092;
  --gx-border: #e8e9f0;
  --gx-border-soft: #eef0f5;
  --gx-sel-bg: #eef0ff;
  --gx-sel-border: #c7caf6;
  --gx-green: #0f8a55;
  --gx-green-bg: #e3f6ec;
  --gx-blue: #2563eb;
  --gx-blue-bg: #e8f0ff;
  --gx-teal: #0f8a7d;
  --gx-teal-bg: #e3f6f2;
  --gx-amber: #b5740c;
  --gx-amber-bg: #fcf1dd;
  --gx-red: #d83a3a;
  --gx-red-bg: #fdebeb;
  --gx-slate: #5b6170;
  --gx-slate-bg: #eceef3;
  --gx-shadow-card: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
  --gx-shadow-modal: 0 24px 60px rgba(28,30,55,.22);
}

@mixin gx-row-grid {
  display: grid;
  grid-template-columns: 46px 1.4fr 1.5fr 1.3fr 1fr 150px;
  gap: 14px;
  align-items: center;
}
```

- [ ] **Step 2: Reescribir `transito.page.scss` con tokens + sticky + layout**

```scss
// src/app/features/analitica/muestras/pages/transito/transito.page.scss
@use './tokens' as *;

.transito-page {
  font-family: 'Poppins', system-ui, sans-serif;
  background: var(--gx-bg);
  min-height: 100%;
  padding: 0 30px 24px;
  color: var(--gx-ink);

  .page-header {
    padding: 24px 0 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;

    h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .subtitle { color: var(--gx-muted); font-size: 13.5px; margin: 4px 0 0; max-width: 720px; }
    .stat-chips { display: flex; gap: 8px; }
    .chip {
      background: var(--gx-card-bg);
      border: 1px solid var(--gx-border);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12.5px;
      color: var(--gx-ink-2);
      &.highlight { background: var(--gx-sel-bg); border-color: var(--gx-sel-border); color: var(--gx-brand-hover); font-weight: 600; }
    }
  }

  .sticky {
    position: sticky;
    top: 0;
    z-index: 50;
    margin-inline: -30px;
    padding: 12px 30px 14px;
    background: var(--gx-bg);
    box-shadow: 0 10px 16px -12px rgba(28,30,55,.22);
    border-bottom: 1px solid var(--gx-border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .columns-header {
    @include gx-row-grid;
    padding: 12px 16px 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--gx-muted);
    font-weight: 600;
  }

  .empty-state {
    text-align: center;
    padding: 64px 16px;
    color: var(--gx-muted);
    font-size: 14px;
  }
}
```

- [ ] **Step 3: Agregar Google Fonts al `index.html`**

En `src/index.html`, dentro de `<head>`, agregar (si no está ya):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Build para verificar**

Run: `npm run build -- --configuration=development`
Expected: build exitosa.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/pages/transito/ src/index.html
git commit -m "feat(transito): tokens privados de la pantalla + Google Fonts + layout base"
```

---

## Task 11: `SampleRowComponent`

**Files:**
- Create: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.ts`
- Create: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.html`
- Create: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.scss`
- Create: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.spec.ts`

- [ ] **Step 1: Crear el spec del componente**

```ts
// sample-row.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { SampleRowComponent } from './sample-row.component';
import type { Sample } from '../../../models/sample.model';

const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'CENTRAL — Sede Central',
  date: '07/06', time: '08:42', urgent: false, state: 'transito',
};

describe('SampleRowComponent', () => {
  let fixture: ComponentFixture<SampleRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleRowComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(SampleRowComponent);
  });

  it('renderiza barcode, paciente, estudio y origen', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('MX-2606-00001');
    expect(text).toContain('García, M.');
    expect(text).toContain('Hemograma completo');
    expect(text).toContain('CENTRAL');
  });

  it('aplica clase is-selected cuando selected=true', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', true);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    const row = fixture.debugElement.query(By.css('.row'));
    expect(row.nativeElement.classList.contains('is-selected')).toBe(true);
  });

  it('muestra tag URGENTE si sample.urgent', () => {
    fixture.componentRef.setInput('sample', { ...SAMPLE, urgent: true });
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('URGENTE');
  });

  it('emite toggle() al click', () => {
    fixture.componentRef.setInput('sample', SAMPLE);
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    let count = 0;
    fixture.componentInstance.toggle.subscribe(() => count++);
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.row')).nativeElement.click();
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run --testPathPattern=sample-row`
Expected: FAIL.

- [ ] **Step 3: Implementar el componente**

```ts
// sample-row.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Sample } from '../../../models/sample.model';

@Component({
  selector: 'app-sample-row',
  standalone: true,
  templateUrl: './sample-row.component.html',
  styleUrl: './sample-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleRowComponent {
  readonly sample = input.required<Sample>();
  readonly selected = input.required<boolean>();
  readonly flashing = input.required<boolean>();
  readonly leaving = input.required<boolean>();

  readonly toggle = output<void>();

  branchShort(): string {
    return (this.sample().branch || '').split(' — ')[0];
  }
}
```

```html
<!-- sample-row.component.html -->
<div
  class="row"
  role="checkbox"
  [attr.aria-checked]="selected()"
  [class.is-selected]="selected()"
  [class.is-flashing]="flashing()"
  [class.is-leaving]="leaving()"
  (click)="toggle.emit()"
  tabindex="0"
>
  <div class="check">
    <span class="box" [class.checked]="selected()"></span>
  </div>
  <div class="col-barcode">
    <span class="barcode">{{ sample().barcode }}</span>
    @if (sample().urgent) { <span class="urgente">URGENTE</span> }
    <div class="patient">{{ sample().patient }}</div>
  </div>
  <div class="col-study">{{ sample().study }}</div>
  <div class="col-origin"><i class="pi pi-map-marker"></i> {{ branchShort() }}</div>
  <div class="col-time">{{ sample().date }} · {{ sample().time }}</div>
  <div class="col-state"><span class="badge teal">En tránsito</span></div>
</div>
```

```scss
// sample-row.component.scss
@use '../../../pages/transito/tokens' as *;

:host { display: block; }

.row {
  @include gx-row-grid;
  min-height: 64px;
  padding: 8px 16px;
  border-top: 1px solid var(--gx-border-soft);
  cursor: pointer;
  position: relative;
  background: var(--gx-card-bg);
  transition: background 0.12s ease;

  &:hover { background: var(--gx-border-soft); }
  &.is-selected {
    background: var(--gx-sel-bg);
    &::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: var(--gx-brand);
    }
  }

  .check .box {
    width: 20px; height: 20px;
    border-radius: 4px;
    border: 1.5px solid var(--gx-border);
    background: #fff;
    display: inline-block;
    &.checked { background: var(--gx-brand); border-color: var(--gx-brand); }
  }

  .barcode { font-family: 'Roboto Mono', ui-monospace; font-size: 14px; font-weight: 500; }
  .urgente {
    background: var(--gx-red-bg); color: var(--gx-red);
    font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: 6px;
  }
  .patient { font-size: 11.5px; color: var(--gx-muted); margin-top: 2px; }
  .col-origin i { margin-right: 4px; color: var(--gx-muted); }
  .col-time { font-size: 13px; color: var(--gx-ink-2); }
  .badge.teal {
    background: var(--gx-teal-bg); color: var(--gx-teal);
    font-size: 12px; font-weight: 600;
    padding: 4px 10px; border-radius: 999px;
  }

  @media (prefers-reduced-motion: no-preference) {
    &.is-flashing { animation: gx-flash 1.1s ease-out; }
    &.is-leaving { animation: gx-leaving 360ms ease-in forwards; }
  }
  @media (prefers-reduced-motion: reduce) {
    &.is-leaving { opacity: 0; transition: opacity 100ms; }
  }

  &:focus-visible { outline: 2px solid var(--gx-brand); outline-offset: -2px; }
}

@keyframes gx-flash {
  0% { background: #fef3c7; }
  100% { background: var(--gx-card-bg); }
}
@keyframes gx-leaving {
  to { transform: translateX(24px); opacity: 0; }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run --testPathPattern=sample-row`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/components/transito/sample-row/
git commit -m "feat(transito): SampleRowComponent con animaciones y tokens"
```

---

## Task 12: `TransitoScanBarComponent` + `BulkActionsBarComponent`

**Files:**
- Create: `src/app/features/analitica/muestras/components/transito/transito-scan-bar/transito-scan-bar.component.ts/.html/.scss/.spec.ts`
- Create: `src/app/features/analitica/muestras/components/transito/bulk-actions-bar/bulk-actions-bar.component.ts/.html/.scss/.spec.ts`

- [ ] **Step 1: Specs**

```ts
// transito-scan-bar.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { TransitoScanBarComponent } from './transito-scan-bar.component';

describe('TransitoScanBarComponent', () => {
  let fixture: ComponentFixture<TransitoScanBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransitoScanBarComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(TransitoScanBarComponent);
  });

  it('placeholder menciona el Lote N cuando hay activo', () => {
    fixture.componentRef.setInput('activeLoteNumber', 2);
    fixture.componentRef.setInput('groupsCount', 1);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.placeholder).toContain('Lote 2');
  });

  it('placeholder menciona "crear un lote" sin lote activo', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 1);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input')).nativeElement.placeholder).toContain('crear');
  });

  it('emite enter con el código al apretar Enter', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 1);
    let captured = '';
    fixture.componentInstance.enter.subscribe(code => captured = code);
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'MX-2606-12345';
    input.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(captured).toBe('MX-2606-12345');
  });

  it('botón "Enviar todo" disabled si groupsCount=0', () => {
    fixture.componentRef.setInput('activeLoteNumber', null);
    fixture.componentRef.setInput('groupsCount', 0);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('button.send-all'));
    expect(btn.nativeElement.disabled).toBe(true);
  });
});
```

```ts
// bulk-actions-bar.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BulkActionsBarComponent } from './bulk-actions-bar.component';
import type { TemporalLote } from '../../../models/transito.model';

describe('BulkActionsBarComponent', () => {
  let fixture: ComponentFixture<BulkActionsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkActionsBarComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(BulkActionsBarComponent);
  });

  function setInputs(selectedCount: number, lotes: TemporalLote[]) {
    fixture.componentRef.setInput('selectedCount', selectedCount);
    fixture.componentRef.setInput('lotes', lotes);
    fixture.detectChanges();
  }

  it('muestra estado reposo con 0 seleccionadas', () => {
    setInputs(0, []);
    expect(fixture.debugElement.query(By.css('.bulk.idle'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button.create')).nativeElement.disabled).toBe(true);
  });

  it('muestra estado activo con >=1 seleccionada y chip por lote', () => {
    const lotes: TemporalLote[] = [
      { id: 'l1', sampleIds: ['s1', 's2'], branch: '', area: '', section: '', createdAt: 1 },
      { id: 'l2', sampleIds: ['s3'], branch: '', area: '', section: '', createdAt: 2 },
    ];
    setInputs(3, lotes);
    expect(fixture.debugElement.query(By.css('.bulk.active'))).toBeTruthy();
    const chips = fixture.debugElement.queryAll(By.css('button.chip-add'));
    expect(chips.length).toBe(2);
    expect(chips[0].nativeElement.textContent).toContain('Lote 1');
    expect(chips[1].nativeElement.textContent).toContain('Lote 2');
  });

  it('emite createLote, addToLote y clear', () => {
    const lotes: TemporalLote[] = [{ id: 'l1', sampleIds: [], branch: '', area: '', section: '', createdAt: 1 }];
    setInputs(2, lotes);
    const emits: string[] = [];
    fixture.componentInstance.createLote.subscribe(() => emits.push('create'));
    fixture.componentInstance.addToLote.subscribe(id => emits.push(`add:${id}`));
    fixture.componentInstance.clear.subscribe(() => emits.push('clear'));
    fixture.debugElement.query(By.css('button.create')).nativeElement.click();
    fixture.debugElement.query(By.css('button.chip-add')).nativeElement.click();
    fixture.debugElement.query(By.css('button.chip-clear')).nativeElement.click();
    expect(emits).toEqual(['create', 'add:l1', 'clear']);
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npm test -- --run --testPathPattern="transito-scan-bar|bulk-actions-bar"`
Expected: FAIL.

- [ ] **Step 3: Implementar `TransitoScanBarComponent`**

```ts
// transito-scan-bar.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-transito-scan-bar',
  standalone: true,
  templateUrl: './transito-scan-bar.component.html',
  styleUrl: './transito-scan-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoScanBarComponent {
  readonly activeLoteNumber = input.required<number | null>();
  readonly groupsCount = input.required<number>();

  readonly enter = output<string>();
  readonly sendAllClick = output<void>();

  protected readonly value = signal('');

  protected readonly placeholder = computed(() => {
    const n = this.activeLoteNumber();
    return n != null
      ? `Escaneá para agregar a Lote ${n}…`
      : 'Escaneá una muestra para crear un lote temporal…';
  });

  protected readonly hint = computed(() => {
    const n = this.activeLoteNumber();
    return n != null ? `Enter → Lote ${n}` : 'Enter → nuevo lote';
  });

  onKey(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter') return;
    const v = this.value().trim();
    if (!v) return;
    this.enter.emit(v);
    this.value.set('');
  }
}
```

```html
<!-- transito-scan-bar.component.html -->
<div class="scanbar">
  <div class="input-wrap">
    <i class="pi pi-barcode"></i>
    <input
      type="text"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
      (keydown)="onKey($event)"
      [placeholder]="placeholder()"
      autocomplete="off"
    >
    <span class="hint">{{ hint() }}</span>
  </div>
  <button
    type="button"
    class="send-all"
    [disabled]="groupsCount() === 0"
    (click)="sendAllClick.emit()"
  >
    <i class="pi pi-truck"></i> Enviar todo
  </button>
</div>
```

```scss
// transito-scan-bar.component.scss
@use '../../../pages/transito/tokens' as *;

.scanbar {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--gx-card-bg);
  border: 1px solid var(--gx-border);
  border-radius: 11px;
  padding: 8px 12px;
  box-shadow: var(--gx-shadow-card);

  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    i.pi-barcode { color: var(--gx-muted); font-size: 20px; }
    input {
      flex: 1; height: 48px; border: 0; outline: 0;
      font-family: 'Roboto Mono', ui-monospace;
      font-size: 15px;
      background: transparent;
    }
    .hint { font-size: 11.5px; color: var(--gx-muted); }
  }

  .send-all {
    background: #eceaff; color: #3a3cc0;
    border: 0; padding: 0 16px; height: 40px;
    border-radius: 10px; font-weight: 600; font-size: 13.5px;
    display: inline-flex; align-items: center; gap: 8px;
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}
```

- [ ] **Step 4: Implementar `BulkActionsBarComponent`**

```ts
// bulk-actions-bar.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TemporalLote } from '../../../models/transito.model';

@Component({
  selector: 'app-bulk-actions-bar',
  standalone: true,
  templateUrl: './bulk-actions-bar.component.html',
  styleUrl: './bulk-actions-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkActionsBarComponent {
  readonly selectedCount = input.required<number>();
  readonly lotes = input.required<TemporalLote[]>();

  readonly createLote = output<void>();
  readonly addToLote = output<string>();
  readonly clear = output<void>();
}
```

```html
<!-- bulk-actions-bar.component.html -->
@if (selectedCount() === 0) {
  <div class="bulk idle">
    <span class="badge muted">0</span>
    <span class="muted">Tildá muestras en cualquier lista (o escaneá) para armar lotes temporales</span>
    <button type="button" class="create outline" disabled>+ Crear lote temporal</button>
  </div>
} @else {
  <div class="bulk active">
    <span class="badge brand">{{ selectedCount() }}</span>
    <span>{{ selectedCount() }} muestras tildadas — armá un lote temporal</span>
    <div class="actions">
      @for (lote of lotes(); track lote.id; let i = $index) {
        <button type="button" class="chip-add" (click)="addToLote.emit(lote.id)">
          → Lote {{ i + 1 }} · {{ lote.sampleIds.length }}
        </button>
      }
      <button type="button" class="create" (click)="createLote.emit()">+ Crear lote temporal</button>
      <button type="button" class="chip-clear" (click)="clear.emit()">✕ Limpiar</button>
    </div>
  </div>
}
```

```scss
// bulk-actions-bar.component.scss
@use '../../../pages/transito/tokens' as *;

.bulk {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13.5px;

  .badge {
    min-width: 26px; height: 26px;
    border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12.5px;
    &.muted { background: var(--gx-slate-bg); color: var(--gx-slate); }
    &.brand { background: #fff; color: var(--gx-brand); }
  }

  &.idle {
    background: var(--gx-card-bg);
    border: 1px dashed #dcdef0;
    color: var(--gx-muted);
    .create { margin-left: auto; }
  }

  &.active {
    background: linear-gradient(90deg, var(--gx-brand), var(--gx-brand-hover));
    color: #fff;
    .actions {
      margin-left: auto;
      display: flex; gap: 8px; align-items: center;
    }
    .chip-add {
      background: rgba(255,255,255,.18); color: #fff;
      border: 0; padding: 6px 10px; border-radius: 999px; font-size: 12.5px; cursor: pointer;
    }
    .create {
      background: #fff; color: var(--gx-brand);
      border: 0; padding: 8px 14px; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .chip-clear {
      background: transparent; color: #fff;
      border: 1px solid rgba(255,255,255,.4);
      padding: 6px 10px; border-radius: 999px; font-size: 12.5px; cursor: pointer;
    }
  }

  .create.outline {
    background: transparent; color: var(--gx-muted);
    border: 1px solid var(--gx-border);
    padding: 8px 14px; border-radius: 10px;
    &:disabled { cursor: not-allowed; opacity: 0.6; }
  }
}
```

- [ ] **Step 5: Correr tests y verificar que pasan**

Run: `npm test -- --run --testPathPattern="transito-scan-bar|bulk-actions-bar"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/muestras/components/transito/transito-scan-bar/ src/app/features/analitica/muestras/components/transito/bulk-actions-bar/
git commit -m "feat(transito): TransitoScanBar + BulkActionsBar"
```

---

## Task 13: `LoteCardComponent` + `RecommendedGroupCardComponent`

**Files:**
- Create: `src/app/features/analitica/muestras/components/transito/lote-card/lote-card.component.ts/.html/.scss/.spec.ts`
- Create: `src/app/features/analitica/muestras/components/transito/recommended-group-card/recommended-group-card.component.ts/.html/.scss/.spec.ts`

> Las dos cards comparten el patrón: header + form de destino + filas de muestra. Para no duplicar el form de destino, ambos lo escriben inline en su template (3 selects + botón) — son ~10 líneas cada uno, no amerita extracción. **DRY se aplica cuando el código se repite N>2 veces con la misma forma; aquí se repite N=2 con diferencias.**

- [ ] **Step 1: Specs (smoke por componente)**

```ts
// lote-card.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { LoteCardComponent } from './lote-card.component';
import type { Sample } from '../../../models/sample.model';
import type { TemporalLote } from '../../../models/transito.model';

const LOTE: TemporalLote = {
  id: 'l1', sampleIds: ['s-1'], branch: '', area: '', section: '', createdAt: 1,
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  date: '07/06', time: '08:00', urgent: false, state: 'transito',
};

describe('LoteCardComponent', () => {
  let fixture: ComponentFixture<LoteCardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(LoteCardComponent);
  });

  function setInputs() {
    fixture.componentRef.setInput('lote', LOTE);
    fixture.componentRef.setInput('number', 1);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isActive', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
  }

  it('renderiza el título "Lote 1" y warning sin destino', () => {
    setInputs();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lote 1');
    expect(text).toContain('Sin destino');
  });

  it('botón Enviar deshabilitado sin destino', () => {
    setInputs();
    const btn = fixture.debugElement.query(By.css('button.send'));
    expect(btn.nativeElement.disabled).toBe(true);
  });

  it('emite send() cuando hay destino y se clickea Enviar', () => {
    fixture.componentRef.setInput('lote', { ...LOTE, branch: 'CENTRAL — Sede Central', area: 'Hematología', section: 'Citometría' });
    fixture.componentRef.setInput('number', 1);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isActive', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();

    let sent = 0;
    fixture.componentInstance.send.subscribe(() => sent++);
    fixture.debugElement.query(By.css('button.send')).nativeElement.click();
    expect(sent).toBe(1);
  });
});
```

```ts
// recommended-group-card.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { RecommendedGroupCardComponent } from './recommended-group-card.component';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup } from '../../../models/transito.model';

const GROUP: RecommendedGroup = {
  id: 'CENTRAL — Sede Central|Hematología|Citometría',
  branch: 'CENTRAL — Sede Central', area: 'Hematología', section: 'Citometría',
  sampleIds: ['s-1'],
};
const SAMPLE: Sample = {
  id: 's-1', barcode: 'MX-2606-00001', study: 'Hemograma completo',
  patient: 'García, M.', branch: 'NORTE — Belgrano',
  date: '07/06', time: '08:00', urgent: false, state: 'transito',
};

describe('RecommendedGroupCardComponent', () => {
  let fixture: ComponentFixture<RecommendedGroupCardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendedGroupCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(RecommendedGroupCardComponent);
  });

  it('muestra área, sucursal, sección y contador', () => {
    fixture.componentRef.setInput('group', GROUP);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isEditing', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hematología');
    expect(text).toContain('CENTRAL');
    expect(text).toContain('Citometría');
    expect(text).toContain('1 muestra');
  });

  it('emite toggleEditing al clickear Editar destino', () => {
    fixture.componentRef.setInput('group', GROUP);
    fixture.componentRef.setInput('samples', [SAMPLE]);
    fixture.componentRef.setInput('selectedIds', new Set<string>());
    fixture.componentRef.setInput('isEditing', false);
    fixture.componentRef.setInput('leavingIds', new Set<string>());
    fixture.componentRef.setInput('flashId', null);
    fixture.detectChanges();
    let count = 0;
    fixture.componentInstance.toggleEditing.subscribe(() => count++);
    fixture.debugElement.query(By.css('button.edit')).nativeElement.click();
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npm test -- --run --testPathPattern="lote-card|recommended-group-card"`
Expected: FAIL.

- [ ] **Step 3: Implementar `LoteCardComponent`**

```ts
// lote-card.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { TemporalLote, TransitoDest } from '../../../models/transito.model';
import { BRANCHES, AREAS, SECTIONS, CURRENT_BRANCH } from '../../../data/catalogs';
import { SampleRowComponent } from '../sample-row/sample-row.component';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  templateUrl: './lote-card.component.html',
  styleUrl: './lote-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoteCardComponent {
  readonly lote = input.required<TemporalLote>();
  readonly number = input.required<number>();
  readonly samples = input.required<Sample[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly isActive = input.required<boolean>();
  readonly leavingIds = input.required<ReadonlySet<string>>();
  readonly flashId = input.required<string | null>();

  readonly toggleSample = output<string>();
  readonly toggleAll = output<boolean>();
  readonly destChange = output<Partial<TransitoDest>>();
  readonly setActive = output<void>();
  readonly dissolve = output<void>();
  readonly send = output<void>();

  protected readonly branches = BRANCHES;
  protected readonly areas = AREAS;
  protected readonly sections = SECTIONS;

  protected readonly hasDest = computed(() => {
    const l = this.lote();
    return !!(l.branch && l.area && l.section);
  });

  protected readonly outcome = computed(() =>
    this.lote().branch === CURRENT_BRANCH ? 'en-proceso' : 'en-transito',
  );

  protected readonly selectedInLote = computed(() => {
    const sel = this.selectedIds();
    return this.lote().sampleIds.filter(id => sel.has(id)).length;
  });

  protected readonly allSelected = computed(() => {
    const ids = this.lote().sampleIds;
    const sel = this.selectedIds();
    return ids.length > 0 && ids.every(id => sel.has(id));
  });

  protected readonly sendLabel = computed(() => {
    const n = this.selectedInLote();
    return n > 0 ? `Enviar ${n} tildadas` : `Enviar ${this.lote().sampleIds.length}`;
  });

  isSelected(id: string): boolean { return this.selectedIds().has(id); }
  isFlashing(id: string): boolean { return this.flashId() === id; }
  isLeaving(id: string): boolean { return this.leavingIds().has(id); }

  onAllToggle(ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.toggleAll.emit(checked);
  }

  onDestField(field: 'branch' | 'area' | 'section', value: string): void {
    this.destChange.emit({ [field]: value });
  }
}
```

```html
<!-- lote-card.component.html -->
<article class="lote-card" [class.no-dest]="!hasDest()">
  <header>
    <input type="checkbox" [checked]="allSelected()" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del lote">
    <i class="pi pi-objects-column"></i>
    <div class="title">
      <span class="name">Lote {{ number() }}</span>
      <span class="tag">TEMPORAL</span>
    </div>
    <div class="meta">
      @if (hasDest()) {
        <span class="dest"><i class="pi pi-map-marker"></i> {{ lote().branch }} · {{ lote().area }} · {{ lote().section }}</span>
        <span class="badge" [class.green]="outcome() === 'en-proceso'" [class.blue]="outcome() === 'en-transito'">
          {{ outcome() === 'en-proceso' ? 'En proceso' : 'En tránsito' }}
        </span>
      } @else {
        <span class="warn"><i class="pi pi-exclamation-triangle"></i> Sin destino — asignalo para poder enviar</span>
      }
      <span class="count">{{ lote().sampleIds.length }} muestras</span>
    </div>
    <button type="button" class="scan-here" [class.is-active]="isActive()" [attr.aria-pressed]="isActive()" (click)="setActive.emit()">
      {{ isActive() ? 'Escaneo → acá' : 'Escanear acá' }}
    </button>
    <button type="button" class="dissolve" (click)="dissolve.emit()" aria-label="Descartar lote">✕</button>
  </header>

  <div class="dest-form">
    <select [value]="lote().branch" (change)="onDestField('branch', $any($event.target).value)">
      <option value="">Sucursal…</option>
      @for (b of branches; track b) { <option [value]="b">{{ b }}</option> }
    </select>
    <select [value]="lote().area" (change)="onDestField('area', $any($event.target).value)">
      <option value="">Área…</option>
      @for (a of areas; track a) { <option [value]="a">{{ a }}</option> }
    </select>
    <select [value]="lote().section" (change)="onDestField('section', $any($event.target).value)">
      <option value="">Sección…</option>
      @for (s of sections; track s) { <option [value]="s">{{ s }}</option> }
    </select>
    <button type="button" class="send" [disabled]="!hasDest()" (click)="send.emit()">{{ sendLabel() }}</button>
  </div>

  <div class="rows">
    @for (s of samples(); track s.id) {
      <app-sample-row
        [sample]="s"
        [selected]="isSelected(s.id)"
        [flashing]="isFlashing(s.id)"
        [leaving]="isLeaving(s.id)"
        (toggle)="toggleSample.emit(s.id)"
      />
    }
  </div>
</article>
```

```scss
// lote-card.component.scss
@use '../../../pages/transito/tokens' as *;

.lote-card {
  background: var(--gx-card-bg);
  border: 2px solid var(--gx-brand);
  border-radius: 14px;
  box-shadow: var(--gx-shadow-card);
  margin-bottom: 12px;
  overflow: hidden;

  &.no-dest { border-color: var(--gx-amber); }
  &.no-dest header { background: var(--gx-amber-bg); }

  header {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gx-border);
    .title {
      display: flex; align-items: center; gap: 8px;
      .name { font-weight: 700; font-size: 14.5px; }
      .tag { background: var(--gx-brand); color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .04em; padding: 2px 6px; border-radius: 4px; }
    }
    .meta { flex: 1; display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: var(--gx-ink-2); }
    .dest i { margin-right: 4px; color: var(--gx-muted); }
    .warn { color: var(--gx-amber); display: inline-flex; align-items: center; gap: 4px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.green { background: var(--gx-green-bg); color: var(--gx-green); }
      &.blue  { background: var(--gx-blue-bg);  color: var(--gx-blue);  }
    }
    .count { color: var(--gx-muted); }
    .scan-here {
      border: 1px solid var(--gx-border); background: #fff;
      padding: 6px 10px; border-radius: 8px; font-size: 12.5px; cursor: pointer;
      &.is-active { background: #eef0ff; border-color: var(--gx-sel-border); color: var(--gx-brand); font-weight: 600; }
    }
    .dissolve {
      border: 0; background: transparent; padding: 4px 8px; font-size: 16px; color: var(--gx-muted); cursor: pointer;
      &:hover { color: var(--gx-red); }
    }
  }

  .dest-form {
    display: grid; grid-template-columns: repeat(3, minmax(0,1fr)) auto;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gx-border-soft);
    select { height: 40px; border: 1px solid var(--gx-border); border-radius: 8px; padding: 0 8px; font-size: 13.5px; }
    .send {
      background: var(--gx-brand); color: #fff; border: 0;
      padding: 0 16px; border-radius: 8px; font-weight: 600; font-size: 13.5px;
      cursor: pointer; height: 40px;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}
```

- [ ] **Step 4: Implementar `RecommendedGroupCardComponent`**

```ts
// recommended-group-card.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup, TransitoDest } from '../../../models/transito.model';
import { BRANCHES, AREAS, SECTIONS, CURRENT_BRANCH } from '../../../data/catalogs';
import { SampleRowComponent } from '../sample-row/sample-row.component';

@Component({
  selector: 'app-recommended-group-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  templateUrl: './recommended-group-card.component.html',
  styleUrl: './recommended-group-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedGroupCardComponent {
  readonly group = input.required<RecommendedGroup>();
  readonly samples = input.required<Sample[]>();
  readonly selectedIds = input.required<ReadonlySet<string>>();
  readonly isEditing = input.required<boolean>();
  readonly leavingIds = input.required<ReadonlySet<string>>();
  readonly flashId = input.required<string | null>();

  readonly toggleSample = output<string>();
  readonly toggleAll = output<boolean>();
  readonly toggleEditing = output<void>();
  readonly destChange = output<Partial<TransitoDest>>();
  readonly send = output<void>();

  protected readonly branches = BRANCHES;
  protected readonly areas = AREAS;
  protected readonly sections = SECTIONS;

  protected readonly outcome = computed(() =>
    this.group().branch === CURRENT_BRANCH ? 'en-proceso' : 'en-transito',
  );

  protected readonly selectedInGroup = computed(() => {
    const sel = this.selectedIds();
    return this.group().sampleIds.filter(id => sel.has(id)).length;
  });

  protected readonly allSelected = computed(() => {
    const ids = this.group().sampleIds;
    const sel = this.selectedIds();
    return ids.length > 0 && ids.every(id => sel.has(id));
  });

  protected readonly sendLabel = computed(() => {
    const n = this.selectedInGroup();
    return n > 0 ? `Enviar ${n} tildadas` : `Enviar ${this.group().sampleIds.length}`;
  });

  protected readonly sendHighlighted = computed(() => this.selectedInGroup() > 0);

  isSelected(id: string): boolean { return this.selectedIds().has(id); }
  isFlashing(id: string): boolean { return this.flashId() === id; }
  isLeaving(id: string): boolean { return this.leavingIds().has(id); }

  onAllToggle(ev: Event): void {
    this.toggleAll.emit((ev.target as HTMLInputElement).checked);
  }

  onDestField(field: 'branch' | 'area' | 'section', value: string): void {
    this.destChange.emit({ [field]: value });
  }
}
```

```html
<!-- recommended-group-card.component.html -->
<article class="group-card" [class.outcome-here]="outcome() === 'en-proceso'" [class.outcome-other]="outcome() === 'en-transito'">
  <header>
    <input type="checkbox" [checked]="allSelected()" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del group">
    <i class="pi" [class.pi-inbox]="outcome() === 'en-proceso'" [class.pi-truck]="outcome() === 'en-transito'"></i>
    <div class="title">
      <span class="area">{{ group().area }}</span>
      <span class="sub"><i class="pi pi-map-marker"></i> {{ group().branch }} · {{ group().section }}</span>
    </div>
    <span class="badge" [class.green]="outcome() === 'en-proceso'" [class.blue]="outcome() === 'en-transito'">
      {{ outcome() === 'en-proceso' ? 'En proceso' : 'En tránsito' }}
    </span>
    <span class="count">{{ group().sampleIds.length }} muestra{{ group().sampleIds.length === 1 ? '' : 's' }}</span>
    <button type="button" class="edit" (click)="toggleEditing.emit()">Editar destino</button>
    <button type="button" class="send" [class.primary]="sendHighlighted()" (click)="send.emit()">{{ sendLabel() }}</button>
  </header>

  @if (isEditing()) {
    <div class="dest-form">
      <select [value]="group().branch" (change)="onDestField('branch', $any($event.target).value)">
        @for (b of branches; track b) { <option [value]="b">{{ b }}</option> }
      </select>
      <select [value]="group().area" (change)="onDestField('area', $any($event.target).value)">
        @for (a of areas; track a) { <option [value]="a">{{ a }}</option> }
      </select>
      <select [value]="group().section" (change)="onDestField('section', $any($event.target).value)">
        @for (s of sections; track s) { <option [value]="s">{{ s }}</option> }
      </select>
    </div>
  }

  <div class="rows">
    @for (s of samples(); track s.id) {
      <app-sample-row
        [sample]="s"
        [selected]="isSelected(s.id)"
        [flashing]="isFlashing(s.id)"
        [leaving]="isLeaving(s.id)"
        (toggle)="toggleSample.emit(s.id)"
      />
    }
  </div>
</article>
```

```scss
// recommended-group-card.component.scss
@use '../../../pages/transito/tokens' as *;

.group-card {
  background: var(--gx-card-bg);
  border: 1px solid var(--gx-border);
  border-radius: 14px;
  box-shadow: var(--gx-shadow-card);
  margin-bottom: 12px;
  overflow: hidden;

  header {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gx-border-soft);

    > i.pi {
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 8px;
    }
    .title {
      display: flex; flex-direction: column; gap: 2px;
      .area { font-weight: 700; font-size: 14.5px; }
      .sub { font-size: 12px; color: var(--gx-muted); i { margin-right: 4px; } }
    }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.green { background: var(--gx-green-bg); color: var(--gx-green); }
      &.blue  { background: var(--gx-blue-bg);  color: var(--gx-blue);  }
    }
    .count { color: var(--gx-muted); font-size: 12.5px; margin-right: auto; }
    .edit, .send {
      border: 1px solid var(--gx-border); background: #fff;
      padding: 7px 12px; border-radius: 8px; font-size: 13px; cursor: pointer;
    }
    .send.primary {
      background: var(--gx-brand); color: #fff; border-color: var(--gx-brand); font-weight: 600;
      box-shadow: var(--gx-shadow-card);
    }
  }

  // El outcome se aplica al .group-card; el ícono está dentro de <header>, no como hijo directo.
  &.outcome-here  header > i.pi { background: var(--gx-green-bg); color: var(--gx-green); }
  &.outcome-other header > i.pi { background: var(--gx-blue-bg);  color: var(--gx-blue);  }

  .dest-form {
    display: grid; grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 10px; padding: 12px 16px;
    border-bottom: 1px solid var(--gx-border-soft);
    select { height: 40px; border: 1px solid var(--gx-border); border-radius: 8px; padding: 0 8px; font-size: 13.5px; }
  }
}
```

- [ ] **Step 5: Correr tests y verificar que pasan**

Run: `npm test -- --run --testPathPattern="lote-card|recommended-group-card"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/muestras/components/transito/lote-card/ src/app/features/analitica/muestras/components/transito/recommended-group-card/
git commit -m "feat(transito): LoteCard + RecommendedGroupCard"
```

---

## Task 14: `ConfirmSendAllDialogComponent`

**Files:**
- Create: `src/app/features/analitica/muestras/components/transito/confirm-send-all-dialog/confirm-send-all-dialog.component.ts/.html/.scss/.spec.ts`

- [ ] **Step 1: Spec**

```ts
// confirm-send-all-dialog.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ConfirmSendAllDialogComponent } from './confirm-send-all-dialog.component';

describe('ConfirmSendAllDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmSendAllDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmSendAllDialogComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmSendAllDialogComponent);
  });

  it('muestra breakdown con totales', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('breakdown', { enProceso: 3, enTransito: 2, groupsCount: 2 });
    fixture.detectChanges();
    const text = document.body.textContent ?? '';
    expect(text).toContain('5'); // total
    expect(text).toContain('3'); // en-proceso
    expect(text).toContain('2'); // en-transito
  });

  it('emite confirm al clickear Enviar', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('breakdown', { enProceso: 1, enTransito: 1, groupsCount: 1 });
    fixture.detectChanges();
    let confirmed = 0;
    fixture.componentInstance.confirm.subscribe(() => confirmed++);
    const btn = document.body.querySelector('button.confirm') as HTMLButtonElement;
    btn.click();
    expect(confirmed).toBe(1);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- --run --testPathPattern=confirm-send-all-dialog`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// confirm-send-all-dialog.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-confirm-send-all-dialog',
  standalone: true,
  imports: [DialogModule],
  templateUrl: './confirm-send-all-dialog.component.html',
  styleUrl: './confirm-send-all-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmSendAllDialogComponent {
  readonly open = input.required<boolean>();
  readonly breakdown = input.required<{ enProceso: number; enTransito: number; groupsCount: number }>();

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  protected readonly total = computed(() => this.breakdown().enProceso + this.breakdown().enTransito);
}
```

```html
<!-- confirm-send-all-dialog.component.html -->
<p-dialog
  [visible]="open()"
  (visibleChange)="$event || cancel.emit()"
  [modal]="true"
  [closable]="false"
  [style]="{ width: '440px', borderRadius: '16px' }"
  [dismissableMask]="true"
>
  <div class="confirm-body">
    <div class="icon"><i class="pi pi-truck"></i></div>
    <h2>Enviar todo según la recomendación</h2>
    <p>
      Se enviarán las <b>{{ total() }} muestras</b> de las {{ breakdown().groupsCount }} listas pre-calculadas,
      cada una al destino que calculó la mochila. Los lotes temporales no se ven afectados.
    </p>
    <div class="breakdown">
      <div class="row green">
        <span class="dot"></span>
        <span>En proceso · esta sucursal</span>
        <strong>{{ breakdown().enProceso }}</strong>
      </div>
      <div class="row blue">
        <span class="dot"></span>
        <span>En tránsito · otras sucursales</span>
        <strong>{{ breakdown().enTransito }}</strong>
      </div>
    </div>
    <p class="warn"><i class="pi pi-exclamation-triangle"></i> Esta acción no se puede deshacer.</p>
    <footer>
      <button type="button" class="cancel" (click)="cancel.emit()">Cancelar</button>
      <button type="button" class="confirm" (click)="confirm.emit()">Enviar {{ total() }}</button>
    </footer>
  </div>
</p-dialog>
```

```scss
// confirm-send-all-dialog.component.scss
@use '../../../pages/transito/tokens' as *;

.confirm-body {
  padding: 8px;
  text-align: left;
  font-family: 'Poppins', system-ui;
  color: var(--gx-ink);

  .icon {
    width: 56px; height: 56px;
    border-radius: 14px;
    background: var(--gx-green-bg); color: var(--gx-green);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 28px;
    margin-bottom: 12px;
  }
  h2 { font-size: 17px; margin: 0 0 8px; font-weight: 700; }
  p { font-size: 13.5px; color: var(--gx-ink-2); line-height: 1.4; }

  .breakdown {
    margin: 12px 0;
    display: flex; flex-direction: column; gap: 6px;
    .row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 10px;
      font-size: 13.5px;
      .dot { width: 8px; height: 8px; border-radius: 999px; }
      strong { margin-left: auto; font-size: 15px; }
      &.green { background: var(--gx-green-bg); color: var(--gx-green); .dot { background: var(--gx-green); } }
      &.blue  { background: var(--gx-blue-bg);  color: var(--gx-blue);  .dot { background: var(--gx-blue); } }
    }
  }
  .warn { color: var(--gx-amber); font-size: 12.5px; }

  footer {
    display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;
    .cancel {
      background: transparent; border: 1px solid var(--gx-border);
      padding: 9px 16px; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .confirm {
      background: var(--gx-green); color: #fff; border: 0;
      padding: 9px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
  }
}
```

- [ ] **Step 4: Correr tests y verificar que pasan**

Run: `npm test -- --run --testPathPattern=confirm-send-all-dialog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/components/transito/confirm-send-all-dialog/
git commit -m "feat(transito): ConfirmSendAllDialog con desglose"
```

---

## Task 15: Integrar `TransitoPage` con todos los componentes + smoke test + verificación manual

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/transito/transito.page.ts`
- Modify: `src/app/features/analitica/muestras/pages/transito/transito.page.html`
- Create: `src/app/features/analitica/muestras/pages/transito/transito.page.spec.ts`

- [ ] **Step 1: Smoke spec del page**

```ts
// transito.page.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TransitoPage } from './transito.page';

function installLocalStorageMock() {
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

describe('TransitoPage smoke', () => {
  let fixture: ComponentFixture<TransitoPage>;

  beforeEach(async () => {
    installLocalStorageMock();
    await TestBed.configureTestingModule({
      imports: [TransitoPage],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TransitoPage);
  });

  it('renderiza el header con stats', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Muestras en tránsito');
    expect(text).toMatch(/\d+ en tránsito/);
  });

  it('renderiza al menos un group con seed por defecto', () => {
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('app-recommended-group-card');
    expect(groups.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implementar `TransitoPage` completo**

```ts
// transito.page.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import type { Sample } from '../../models/sample.model';
import type { TransitoDest } from '../../models/transito.model';
import { MockSamplesService } from '../../services/mock-samples.service';
import { TransitoLotesService } from '../../services/transito-lotes.service';
import { TransitoScanBarComponent } from '../../components/transito/transito-scan-bar/transito-scan-bar.component';
import { BulkActionsBarComponent } from '../../components/transito/bulk-actions-bar/bulk-actions-bar.component';
import { LoteCardComponent } from '../../components/transito/lote-card/lote-card.component';
import { RecommendedGroupCardComponent } from '../../components/transito/recommended-group-card/recommended-group-card.component';
import { ConfirmSendAllDialogComponent } from '../../components/transito/confirm-send-all-dialog/confirm-send-all-dialog.component';
import { CURRENT_BRANCH } from '../../data/catalogs';

@Component({
  selector: 'app-transito-page',
  standalone: true,
  imports: [
    ToastModule, TransitoScanBarComponent, BulkActionsBarComponent,
    LoteCardComponent, RecommendedGroupCardComponent, ConfirmSendAllDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './transito.page.html',
  styleUrl: './transito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoPage {
  protected readonly service = inject(TransitoLotesService);
  private readonly samplesService = inject(MockSamplesService);
  private readonly messages = inject(MessageService);

  protected readonly flashId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);

  protected readonly activeLoteNumber = computed(() => {
    const id = this.service.activeLoteId();
    if (!id) return null;
    const idx = this.service.lotes().findIndex(l => l.id === id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected readonly sendAllBreakdown = computed(() => {
    const groups = this.service.groups();
    let enProceso = 0, enTransito = 0;
    for (const g of groups) {
      if (g.branch === CURRENT_BRANCH) enProceso += g.sampleIds.length;
      else enTransito += g.sampleIds.length;
    }
    return { enProceso, enTransito, groupsCount: groups.length };
  });

  // resuelve sampleIds → samples para pasar a las cards
  samplesOf(ids: string[]): Sample[] {
    const all = this.samplesService.samples();
    const set = new Set(ids);
    return all.filter(s => set.has(s.id));
  }

  loteNumber(loteId: string): number {
    return this.service.lotes().findIndex(l => l.id === loteId) + 1;
  }

  onScanEnter(code: string): void {
    const result = this.service.scan(code);
    if (result.outcome === 'added' && result.matchedId) {
      this.flashId.set(result.matchedId);
      setTimeout(() => this.flashId.set(null), 1100);
    } else if (result.outcome === 'duplicate') {
      this.messages.add({
        severity: 'warn',
        summary: `Ya está en Lote ${result.duplicateLoteNumber}`,
        life: 3800,
      });
    }
    // no-match: silencio intencional
  }

  onSendAllClick(): void {
    if (this.service.groups().length === 0) return;
    this.confirmOpen.set(true);
  }

  async onConfirmSendAll(): Promise<void> {
    this.confirmOpen.set(false);
    const total = this.sendAllBreakdown().enProceso + this.sendAllBreakdown().enTransito;
    const result = await this.service.sendAll();
    this.messages.add({
      severity: 'success',
      summary: `${total} muestras enviadas según la recomendación`,
      detail: `${result.enProceso} en proceso · ${result.enTransito} en tránsito`,
      life: 3800,
    });
  }

  onCreateLote(): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    const id = this.service.createLote(ids);
    const n = this.loteNumber(id);
    this.messages.add({
      severity: 'success',
      summary: `Lote ${n} temporal creado · ${ids.length} muestras`,
      detail: 'Asignale destino y envialo cuando quieras',
      life: 3800,
    });
  }

  onAddToLote(loteId: string): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    this.service.addToLote(loteId, ids);
    this.messages.add({
      severity: 'info',
      summary: `${ids.length} muestras → Lote ${this.loteNumber(loteId)}`,
      life: 3800,
    });
  }

  onDissolveLote(loteId: string): void {
    const n = this.loteNumber(loteId);
    const count = this.service.lotes().find(l => l.id === loteId)?.sampleIds.length ?? 0;
    this.service.dissolveLote(loteId);
    this.messages.add({
      severity: 'secondary',
      summary: `Lote ${n} descartado`,
      detail: `${count} muestras volvieron a su workspace recomendado`,
      life: 3800,
    });
  }

  async onSendGroup(groupId: string): Promise<void> {
    const result = await this.service.send(groupId, 'group');
    if (!result) return;
    this.emitSendToast(result);
  }

  async onSendLote(loteId: string): Promise<void> {
    const result = await this.service.send(loteId, 'lote');
    if (!result) return;
    this.emitSendToast(result);
  }

  onUpdateDestGroup(groupId: string, patch: Partial<TransitoDest>): void {
    this.service.updateDest({ kind: 'group', id: groupId }, patch);
  }
  onUpdateDestLote(loteId: string, patch: Partial<TransitoDest>): void {
    this.service.updateDest({ kind: 'lote', id: loteId }, patch);
  }
  onToggleEditing(groupId: string): void {
    this.service.toggleEditing(groupId);
  }
  onSetActiveLote(loteId: string): void {
    this.service.setActiveLote(this.service.activeLoteId() === loteId ? null : loteId);
  }
  onToggleAllGroup(groupId: string, on: boolean): void {
    const ids = this.service.groups().find(g => g.id === groupId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleAllLote(loteId: string, on: boolean): void {
    const ids = this.service.lotes().find(l => l.id === loteId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleSample(id: string): void {
    this.service.toggleSel(id);
  }
  onClearSelection(): void {
    this.service.clearSel();
  }

  isLoteActive(loteId: string): boolean {
    return this.service.activeLoteId() === loteId;
  }
  isGroupEditing(groupId: string): boolean {
    return this.service.editing().has(groupId);
  }

  private emitSendToast(result: { enProceso: number; enTransito: number; detail: string }): void {
    const total = result.enProceso + result.enTransito;
    const target = result.enProceso > 0 ? 'En proceso' : 'En tránsito';
    this.messages.add({
      severity: 'success',
      summary: `${total} muestras → ${target}`,
      detail: result.detail,
      life: 3800,
    });
  }
}
```

```html
<!-- transito.page.html -->
<section class="transito-page">
  <header class="page-header">
    <div>
      <h1>Muestras en tránsito</h1>
      <p class="subtitle">
        Las listas son recomendaciones de la mochila, no definitivas.
        Tildá o escaneá muestras para armar lotes temporales y enviarlos cuando quieras.
      </p>
    </div>
    <div class="stat-chips">
      <span class="chip">{{ service.stats().total }} en tránsito</span>
      <span class="chip">{{ service.stats().groups }} listas recomendadas</span>
      <span class="chip" [class.highlight]="service.stats().lotes > 0">{{ service.stats().lotes }} lotes temporales</span>
    </div>
  </header>

  <div class="sticky">
    <app-transito-scan-bar
      [activeLoteNumber]="activeLoteNumber()"
      [groupsCount]="service.stats().groups"
      (enter)="onScanEnter($event)"
      (sendAllClick)="onSendAllClick()"
    />
    <app-bulk-actions-bar
      [selectedCount]="service.sel().size"
      [lotes]="service.lotes()"
      (createLote)="onCreateLote()"
      (addToLote)="onAddToLote($event)"
      (clear)="onClearSelection()"
    />
  </div>

  <div class="columns-header">
    <span></span><span>Muestra</span><span>Estudio</span><span>Origen</span><span>Toma</span><span>Estado</span>
  </div>

  @for (lote of service.lotes(); track lote.id; let i = $index) {
    <app-lote-card
      [lote]="lote"
      [number]="i + 1"
      [samples]="samplesOf(lote.sampleIds)"
      [selectedIds]="service.sel()"
      [isActive]="isLoteActive(lote.id)"
      [leavingIds]="service.leaving()"
      [flashId]="flashId()"
      (toggleSample)="onToggleSample($event)"
      (toggleAll)="onToggleAllLote(lote.id, $event)"
      (destChange)="onUpdateDestLote(lote.id, $event)"
      (setActive)="onSetActiveLote(lote.id)"
      (dissolve)="onDissolveLote(lote.id)"
      (send)="onSendLote(lote.id)"
    />
  }

  @for (group of service.groups(); track group.id) {
    <app-recommended-group-card
      [group]="group"
      [samples]="samplesOf(group.sampleIds)"
      [selectedIds]="service.sel()"
      [isEditing]="isGroupEditing(group.id)"
      [leavingIds]="service.leaving()"
      [flashId]="flashId()"
      (toggleSample)="onToggleSample($event)"
      (toggleAll)="onToggleAllGroup(group.id, $event)"
      (toggleEditing)="onToggleEditing(group.id)"
      (destChange)="onUpdateDestGroup(group.id, $event)"
      (send)="onSendGroup(group.id)"
    />
  }

  @if (service.lotes().length === 0 && service.groups().length === 0) {
    <div class="empty-state">
      <p><b>Todo enviado</b></p>
      <p>No quedan muestras en tránsito.</p>
    </div>
  }
</section>

<p-toast position="bottom-right" />
<app-confirm-send-all-dialog
  [open]="confirmOpen()"
  [breakdown]="sendAllBreakdown()"
  (cancel)="confirmOpen.set(false)"
  (confirm)="onConfirmSendAll()"
/>
```

- [ ] **Step 3: Correr los specs del page**

Run: `npm test -- --run --testPathPattern=transito.page`
Expected: PASS.

- [ ] **Step 4: Correr el full suite**

Run: `npm test -- --run`
Expected: todos los tests pasan (los del worklist y los nuevos).

- [ ] **Step 5: Build y verificación manual en el browser**

Run: `npm run build -- --configuration=development`
Expected: build exitosa.

Verificación manual (con dev server corriendo en `:4200`), checklist del Definition of Done del spec:
- [ ] Abrir `/analitica/traslado`, ver header con stats + 2-3 groups con muestras seed.
- [ ] Tildar muestras → la barra cambia a estado activo.
- [ ] Crear lote temporal → aparece arriba con borde lila, warning ámbar "Sin destino".
- [ ] Asignar destino al lote (3 selects) → warning desaparece, badge outcome aparece.
- [ ] Escanear un barcode (escribir y Enter) → flash amarillo, se agrega al lote activo.
- [ ] Escanear de nuevo → toast warn "Ya está en Lote N".
- [ ] Click "Editar destino" en un group → form aparece, cambiar branch → group se reagrupa.
- [ ] Enviar parcial (tildar 2 de 5 en un group, click Enviar) → solo se envían 2.
- [ ] "Enviar todo" → modal con desglose verde/azul → confirmar → toast con resultado, groups vacíos, lotes intactos.
- [ ] Descartar lote (✕) → muestras vuelven al group.
- [ ] Recargar (F5) → lotes con destino persistido siguen ahí.
- [ ] Visitar `/analitica/recoleccion`, `/procesamiento`, `/descarte` → siguen funcionando idénticas a hoy.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/muestras/pages/transito/
git commit -m "feat(transito): integración TransitoPage + smoke test"
```

---

## Verificación de Definition of Done

Antes de pedir merge, validar:

- [ ] `npm test` verde (todos los suites).
- [ ] `npm run build` sin errores ni warnings nuevos.
- [ ] Las 9 invariantes del service cubiertas por tests (verificar en `transito-lotes.service.spec.ts`).
- [ ] Smoke del page pasa.
- [ ] Las otras 3 pantallas (recolección/procesamiento/descarte) verificadas en browser, intactas.
- [ ] Verificación manual del operador completa (checklist de Task 15 Step 5).
- [ ] No hay leak técnico en toasts (todo en español, sin FQCN, sin nombres de clase).
