# Obras Sociales (mock) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _(pendiente — crear con `jira-workflow` ANTES de implementar; luego reemplazar por `[KAN-N](URL)` — regla #1/#3 del CLAUDE.md)_

**Goal:** Implementar las 3 pantallas de Obras Sociales (listado en tabla, stepper de alta, detalle con tabs) con datos mock y NgRx clásico, dejando el mock aislado en el servicio para enchufar el backend después.

**Architecture:** Feature `features/obras-sociales/` con `models/ + services/ + store/ + pages/`. NgRx clásico (actions/effects/reducer/selectors), registrado a nivel ruta (lazy). El servicio (`ObraSocialService`) devuelve `Observable` desde un array en memoria (persistencia de sesión); el swap a backend = cambiar solo los cuerpos de sus métodos. UI con PrimeNG + Tailwind, calcada de los patrones de `pacientes` (`patient-list` / `patient-form` / `patient-detail`).

**Tech Stack:** Angular 21 (standalone, signals, OnPush), NgRx 21 clásico, PrimeNG 21 (`p-table`, `p-tabs`, `p-select`, `p-button`, `p-confirmDialog`), Tailwind 4, Vitest (globals + jsdom).

**Spec:** `docs/superpowers/specs/2026-05-30-obras-sociales-mock-design.md`

---

## Convenciones y notas de ejecución

- **Worktree:** trabajar en `c:/Users/tobia/Desktop/TUP/TESIS/FRONTEND-LABORATORIO/.worktrees/obras-sociales-mock` (rama `feat/obras-sociales-mock`). Todas las rutas de abajo son relativas a esa raíz.
- **Aliases:** `@core`, `@shared`, `@layout`, `@features` (definidos en `vitest.config.ts` y `tsconfig.app.json`). Usarlos.
- **Tests:** Vitest con `globals: true` → `describe/it/expect/vi/beforeEach` están disponibles sin import. Correr un archivo puntual: `npx vitest run <ruta-al-spec>`. Suite completa: `npm test`.
- **Qué se testea (regla CLAUDE.md):** TDD (test primero) para `reducer`, `selectors`, `service`, `effects`. Páginas: **smoke test** (TestBed + `provideMockStore`).
- **Mensajes al usuario (regla #4):** todo toast/error en **español**, sin leak de internals, sin emojis Unicode (usar PrimeIcons).
- **Commits:** convencionales, scope `obras-sociales`. Terminar cada mensaje con la línea `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **No tocar** `app.routes.ts` (ya hace `loadChildren` de `OBRAS_SOCIALES_ROUTES`) ni `sidebar.nav.ts` (el ítem "Obras Sociales" ya existe).

### Scope notes (simplificaciones conscientes del mock)
- En el stepper, el paso "Planes y convenios" implementa **agregar + eliminar** plan (no edición inline; para "editar" se elimina y re-agrega). Se valida unicidad de `code` entre planes agregados.
- El tab "Convenios" del detalle muestra **selector de plan + tabla de convenios de ese plan**. El filtro por rango de fechas queda **diferido** (los convenios mock son pocos).
- El servicio mock devuelve `of(...)` **sin `delay`** artificial (mantiene los tests simples; el `pending` igual transiciona).

---

## Estructura de archivos a crear

```
src/app/features/obras-sociales/
├── obras-sociales.routes.ts                 # MODIFICAR (Task 8)
├── models/
│   ├── insurer.model.ts                     # Task 1
│   ├── plan.model.ts                         # Task 1
│   ├── agreement.model.ts                    # Task 1
│   ├── contact-info.model.ts                 # Task 1
│   ├── catalogs.model.ts                     # Task 1
│   ├── wizard.model.ts                       # Task 1
│   └── obra-social-page.model.ts             # Task 1
├── services/
│   ├── mock-data.ts                          # Task 2
│   ├── obra-social.service.ts                # Task 3
│   └── obra-social.service.spec.ts           # Task 3
├── store/
│   ├── obra-social.state.ts                  # Task 4
│   ├── obra-social.actions.ts                # Task 4
│   ├── obra-social.reducer.ts                # Task 5
│   ├── obra-social.reducer.spec.ts           # Task 5
│   ├── obra-social.selectors.ts              # Task 6
│   ├── obra-social.selectors.spec.ts         # Task 6
│   ├── obra-social.effects.ts                # Task 7
│   └── obra-social.effects.spec.ts           # Task 7
└── pages/
    ├── obras-sociales-list/
    │   ├── obras-sociales-list.page.ts        # Task 9
    │   └── obras-sociales-list.page.spec.ts   # Task 9
    ├── obra-social-form/
    │   ├── obra-social-form-steps.ts          # Task 10
    │   ├── components/stepper-header/
    │   │   └── obra-social-stepper-header.component.ts   # Task 10
    │   ├── steps/
    │   │   ├── aseguradora-step.component.ts   # Task 11
    │   │   ├── planes-step.component.ts        # Task 11
    │   │   └── resumen-step.component.ts       # Task 11
    │   ├── obra-social-form.page.ts            # Task 12
    │   └── obra-social-form.page.spec.ts       # Task 12
    └── obra-social-detail/
        ├── obra-social-detail.page.ts          # Task 13
        └── obra-social-detail.page.spec.ts     # Task 13
```
(Eliminar el placeholder `pages/obras-sociales/obras-sociales.page.ts` en Task 8.)

---

## Task 1: Modelos

**Files:**
- Create: `src/app/features/obras-sociales/models/agreement.model.ts`
- Create: `src/app/features/obras-sociales/models/contact-info.model.ts`
- Create: `src/app/features/obras-sociales/models/plan.model.ts`
- Create: `src/app/features/obras-sociales/models/insurer.model.ts`
- Create: `src/app/features/obras-sociales/models/catalogs.model.ts`
- Create: `src/app/features/obras-sociales/models/wizard.model.ts`
- Create: `src/app/features/obras-sociales/models/obra-social-page.model.ts`

- [ ] **Step 1: Crear `agreement.model.ts`**

```typescript
export interface Agreement {
  id: number;
  insurerPlanId: number;
  insurerPlanName?: string;
  versionNbu: number;             // id de NbuVersion
  requiresCopayment: boolean;
  coveragePercentage: number;     // 0-100
  ubValue: number;                // > 0
  validFromDate: string;          // ISO yyyy-MM-dd
  validToDate?: string | null;
}
```

- [ ] **Step 2: Crear `contact-info.model.ts`**

```typescript
export type ContactTypeCode = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'WEBSITE';

export interface InsurerContactInfo {
  id: number;
  insurerId: number;
  contactType: ContactTypeCode;
  contact: string;
  isActive: boolean;
}

export interface ContactType {
  name: ContactTypeCode;
  description: string;
}

export const CONTACT_TYPE_LABELS: Record<ContactTypeCode, string> = {
  PHONE: 'Teléfono',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  WEBSITE: 'Sitio web',
};
```

- [ ] **Step 3: Crear `plan.model.ts`**

```typescript
import { Agreement } from './agreement.model';

export interface PlanComplete {
  id: number;
  insurerId: number;
  insurerName: string;
  code: string;
  acronym: string;
  name: string;
  description?: string;
  isActive: boolean;
  iva: number;                    // %
  actualAgreements: Agreement[];
}
```

- [ ] **Step 4: Crear `insurer.model.ts`**

```typescript
import { PlanComplete } from './plan.model';
import { InsurerContactInfo } from './contact-info.model';

export type InsurerTypeCode = 'SOCIAL' | 'PRIVATE' | 'SELF_PAY';

export interface SpecificData {
  socialHealth?: { cuit: string } | null;
  privateHealth?: { cuit: string; copayPolicy: string } | null;
  selfPay?: { acceptedPaymentMethods: string } | null;
}

export interface InsurerSummary {
  id: number;
  code: string;
  acronym: string;
  name: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;
  active: boolean;
}

export interface InsurerComplete {
  id: number;
  code: string;
  name: string;
  acronym: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;
  description?: string;
  authorizationUrl?: string;
  active: boolean;
  specificData?: SpecificData | null;
  plans: PlanComplete[];
  contacts: InsurerContactInfo[];
}

export const INSURER_TYPE_LABELS: Record<InsurerTypeCode, string> = {
  SOCIAL: 'Obra Social',
  PRIVATE: 'Prepaga',
  SELF_PAY: 'Particular',
};

export function humanizeInsurerType(code: InsurerTypeCode): string {
  return INSURER_TYPE_LABELS[code] ?? code;
}
```

- [ ] **Step 5: Crear `catalogs.model.ts`**

```typescript
import { InsurerTypeCode } from './insurer.model';

export interface InsurerType {
  name: InsurerTypeCode;
  description: string;
}

export interface NbuVersion {
  id: number;
  versionCode: string;            // ej. "2021_2024"
  publicationYear: number;
  effectivityDate: string;        // ISO
}

export interface NbuOption {
  label: string;
  value: number;
}
```

- [ ] **Step 6: Crear `wizard.model.ts`**

```typescript
import { InsurerTypeCode, SpecificData } from './insurer.model';
import { ContactTypeCode } from './contact-info.model';

export interface WizardInsurer {
  code: string;
  name: string;
  acronym: string;
  insurerType: InsurerTypeCode;
  description?: string;
  authorizationUrl?: string;
  specificData: SpecificData | null;
}

export interface WizardPlan {
  code: string;
  acronym: string;
  name: string;
  iva: number;
  description?: string;
}

export interface WizardAgreement {
  versionNbu: number;
  requiresCopayment: boolean;
  coveragePercentage: number;
  ubValue: number;
  validFromDate: string;          // ISO yyyy-MM-dd
}

export interface PlanWithAgreement {
  plan: WizardPlan;
  agreement: WizardAgreement;
}

export interface WizardContact {
  contactType: ContactTypeCode;
  contact: string;
}

export interface WizardCreate {
  insurer: WizardInsurer;
  plans: PlanWithAgreement[];
  contacts: WizardContact[];
}
```

- [ ] **Step 7: Crear `obra-social-page.model.ts`**

```typescript
import { InsurerSummary, InsurerTypeCode } from './insurer.model';

export type InsurerStateFilter = 'active' | 'inactive' | 'all';

export interface ObraSocialPageRequest {
  q?: string;
  state: InsurerStateFilter;
  insurerType?: InsurerTypeCode;
  page: number;
  size: number;
}

export interface ObraSocialPageResult {
  content: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/features/obras-sociales/models
git commit -m "feat(obras-sociales): modelos TS portados del lab (mock)"
```

---

## Task 2: Datos mock semilla

**Files:**
- Create: `src/app/features/obras-sociales/services/mock-data.ts`

- [ ] **Step 1: Crear `mock-data.ts`** con catálogos + 6 obras sociales (mezcla de tipos, una inactiva, una SELF_PAY sin contactos)

```typescript
import { InsurerComplete, humanizeInsurerType } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';

export const INSURER_TYPES: InsurerType[] = [
  { name: 'SOCIAL', description: 'Obra Social' },
  { name: 'PRIVATE', description: 'Prepaga' },
  { name: 'SELF_PAY', description: 'Particular' },
];

export const NBU_VERSIONS: NbuVersion[] = [
  { id: 1, versionCode: '2012_2016', publicationYear: 2012, effectivityDate: '2012-01-01' },
  { id: 2, versionCode: '2017_2020', publicationYear: 2017, effectivityDate: '2017-01-01' },
  { id: 3, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' },
];

export const CONTACT_TYPES: ContactType[] = [
  { name: 'PHONE', description: 'Teléfono' },
  { name: 'EMAIL', description: 'Email' },
  { name: 'WHATSAPP', description: 'WhatsApp' },
  { name: 'WEBSITE', description: 'Sitio web' },
];

function t(code: 'SOCIAL' | 'PRIVATE' | 'SELF_PAY') {
  return { insurerType: code, insurerTypeName: humanizeInsurerType(code) };
}

export const MOCK_INSURERS: InsurerComplete[] = [
  {
    id: 1, code: 'OSDE', acronym: 'OSDE', name: 'OSDE', ...t('PRIVATE'),
    description: 'Organización de Servicios Directos Empresarios',
    authorizationUrl: 'https://www.osde.com.ar', active: true,
    specificData: { privateHealth: { cuit: '30-54741764-9', copayPolicy: 'Copago según plan' } },
    plans: [
      {
        id: 11, insurerId: 1, insurerName: 'OSDE', code: '210', acronym: '210', name: 'Plan 210',
        description: 'Plan intermedio', isActive: true, iva: 21,
        actualAgreements: [
          { id: 111, insurerPlanId: 11, insurerPlanName: 'Plan 210', versionNbu: 3, requiresCopayment: true, coveragePercentage: 80, ubValue: 1500, validFromDate: '2024-01-01', validToDate: null },
          { id: 112, insurerPlanId: 11, insurerPlanName: 'Plan 210', versionNbu: 2, requiresCopayment: true, coveragePercentage: 70, ubValue: 1200, validFromDate: '2022-01-01', validToDate: '2023-12-31' },
        ],
      },
      {
        id: 12, insurerId: 1, insurerName: 'OSDE', code: '410', acronym: '410', name: 'Plan 410',
        description: 'Plan superior', isActive: true, iva: 21,
        actualAgreements: [
          { id: 121, insurerPlanId: 12, insurerPlanName: 'Plan 410', versionNbu: 3, requiresCopayment: false, coveragePercentage: 100, ubValue: 2000, validFromDate: '2024-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 1001, insurerId: 1, contactType: 'PHONE', contact: '0810-555-6733', isActive: true },
      { id: 1002, insurerId: 1, contactType: 'WEBSITE', contact: 'https://www.osde.com.ar', isActive: true },
    ],
  },
  {
    id: 2, code: 'SWISS', acronym: 'SMG', name: 'Swiss Medical', ...t('PRIVATE'),
    description: 'Swiss Medical Group', authorizationUrl: 'https://www.swissmedical.com.ar', active: true,
    specificData: { privateHealth: { cuit: '30-61443054-0', copayPolicy: 'Sin copago en plan SMG40' } },
    plans: [
      {
        id: 21, insurerId: 2, insurerName: 'Swiss Medical', code: 'SMG20', acronym: 'SMG20', name: 'SMG 20',
        description: 'Plan base', isActive: true, iva: 21,
        actualAgreements: [
          { id: 211, insurerPlanId: 21, insurerPlanName: 'SMG 20', versionNbu: 3, requiresCopayment: true, coveragePercentage: 75, ubValue: 1400, validFromDate: '2024-03-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 2001, insurerId: 2, contactType: 'PHONE', contact: '0810-444-7793', isActive: true },
      { id: 2002, insurerId: 2, contactType: 'EMAIL', contact: 'atencion@swissmedical.com.ar', isActive: true },
    ],
  },
  {
    id: 3, code: 'IOMA', acronym: 'IOMA', name: 'IOMA', ...t('SOCIAL'),
    description: 'Instituto de Obra Médico Asistencial (Buenos Aires)', authorizationUrl: '', active: true,
    specificData: { socialHealth: { cuit: '30-62739371-9' } },
    plans: [
      {
        id: 31, insurerId: 3, insurerName: 'IOMA', code: 'IOMA-GRAL', acronym: 'GRAL', name: 'General',
        description: 'Cobertura general', isActive: true, iva: 0,
        actualAgreements: [
          { id: 311, insurerPlanId: 31, insurerPlanName: 'General', versionNbu: 2, requiresCopayment: true, coveragePercentage: 60, ubValue: 900, validFromDate: '2023-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 3001, insurerId: 3, contactType: 'PHONE', contact: '0800-222-4662', isActive: true },
    ],
  },
  {
    id: 4, code: 'PAMI', acronym: 'PAMI', name: 'PAMI', ...t('SOCIAL'),
    description: 'Instituto Nacional de Servicios Sociales para Jubilados y Pensionados', authorizationUrl: '', active: true,
    specificData: { socialHealth: { cuit: '30-62258522-5' } },
    plans: [
      {
        id: 41, insurerId: 4, insurerName: 'PAMI', code: 'PAMI-AFIL', acronym: 'AFIL', name: 'Afiliado',
        description: 'Cobertura afiliados', isActive: true, iva: 0,
        actualAgreements: [
          { id: 411, insurerPlanId: 41, insurerPlanName: 'Afiliado', versionNbu: 1, requiresCopayment: false, coveragePercentage: 100, ubValue: 800, validFromDate: '2021-06-01', validToDate: null },
        ],
      },
    ],
    contacts: [
      { id: 4001, insurerId: 4, contactType: 'PHONE', contact: '138', isActive: true },
    ],
  },
  {
    id: 5, code: 'PART', acronym: 'PART', name: 'Particular', ...t('SELF_PAY'),
    description: 'Pacientes sin cobertura / pago directo', authorizationUrl: '', active: true,
    specificData: { selfPay: { acceptedPaymentMethods: 'Efectivo, débito, crédito, transferencia' } },
    plans: [
      {
        id: 51, insurerId: 5, insurerName: 'Particular', code: 'PART-STD', acronym: 'STD', name: 'Estándar',
        description: 'Lista de precios particular', isActive: true, iva: 21,
        actualAgreements: [
          { id: 511, insurerPlanId: 51, insurerPlanName: 'Estándar', versionNbu: 3, requiresCopayment: false, coveragePercentage: 0, ubValue: 2500, validFromDate: '2024-01-01', validToDate: null },
        ],
      },
    ],
    contacts: [],
  },
  {
    id: 6, code: 'ASE', acronym: 'ASE', name: 'ASE Nacional', ...t('PRIVATE'),
    description: 'Plan dado de baja (histórico)', authorizationUrl: '', active: false,
    specificData: { privateHealth: { cuit: '30-70812345-6', copayPolicy: 'Discontinuado' } },
    plans: [],
    contacts: [
      { id: 6001, insurerId: 6, contactType: 'EMAIL', contact: 'baja@asenacional.com.ar', isActive: false },
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/app/features/obras-sociales/services/mock-data.ts
git commit -m "feat(obras-sociales): datos mock semilla (catálogos + 6 obras sociales)"
```

---

## Task 3: Servicio mock (TDD)

**Files:**
- Create: `src/app/features/obras-sociales/services/obra-social.service.spec.ts`
- Create: `src/app/features/obras-sociales/services/obra-social.service.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/app/features/obras-sociales/services/obra-social.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ObraSocialService } from './obra-social.service';
import { WizardCreate } from '../models/wizard.model';

describe('ObraSocialService (mock)', () => {
  let service: ObraSocialService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ObraSocialService] });
    service = TestBed.inject(ObraSocialService);
  });

  it('search devuelve solo activas por defecto y pagina', async () => {
    const res = await firstValueFrom(service.search({ state: 'active', page: 0, size: 20 }));
    expect(res.content.length).toBeGreaterThan(0);
    expect(res.content.every((o) => o.active)).toBe(true);
    expect(res.totalElements).toBe(res.content.length);
  });

  it('search state=inactive devuelve solo inactivas', async () => {
    const res = await firstValueFrom(service.search({ state: 'inactive', page: 0, size: 20 }));
    expect(res.content.every((o) => !o.active)).toBe(true);
  });

  it('search filtra por insurerType', async () => {
    const res = await firstValueFrom(service.search({ state: 'all', insurerType: 'SOCIAL', page: 0, size: 20 }));
    expect(res.content.every((o) => o.insurerType === 'SOCIAL')).toBe(true);
  });

  it('search filtra por q (nombre/sigla/código, case-insensitive)', async () => {
    const res = await firstValueFrom(service.search({ state: 'all', q: 'osde', page: 0, size: 20 }));
    expect(res.content.some((o) => o.name.toLowerCase().includes('osde'))).toBe(true);
  });

  it('getCompleteById devuelve la obra social con planes y contactos', async () => {
    const os = await firstValueFrom(service.getCompleteById(1));
    expect(os.id).toBe(1);
    expect(os.plans.length).toBeGreaterThan(0);
  });

  it('getCompleteById de id inexistente emite error', async () => {
    await expect(firstValueFrom(service.getCompleteById(99999))).rejects.toBeTruthy();
  });

  it('createFromWizard agrega y queda recuperable por getCompleteById', async () => {
    const payload: WizardCreate = {
      insurer: {
        code: 'NEW', name: 'Nueva OS', acronym: 'NOS', insurerType: 'SOCIAL',
        description: 'desc', authorizationUrl: '', specificData: { socialHealth: { cuit: '30-11111111-1' } },
      },
      plans: [{
        plan: { code: 'P1', acronym: 'P1', name: 'Plan 1', iva: 21 },
        agreement: { versionNbu: 3, requiresCopayment: false, coveragePercentage: 90, ubValue: 1000, validFromDate: '2026-01-01' },
      }],
      contacts: [{ contactType: 'PHONE', contact: '123' }],
    };
    const created = await firstValueFrom(service.createFromWizard(payload));
    expect(created.id).toBeGreaterThan(0);
    expect(created.insurerTypeName).toBe('Obra Social');
    const fetched = await firstValueFrom(service.getCompleteById(created.id));
    expect(fetched.name).toBe('Nueva OS');
    expect(fetched.plans[0].actualAgreements[0].coveragePercentage).toBe(90);
  });

  it('getInsurerTypes / getNbuVersions / getContactTypes devuelven catálogos', async () => {
    expect((await firstValueFrom(service.getInsurerTypes())).length).toBe(3);
    expect((await firstValueFrom(service.getNbuVersions())).length).toBeGreaterThan(0);
    expect((await firstValueFrom(service.getContactTypes())).length).toBe(4);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/obras-sociales/services/obra-social.service.spec.ts`
Expected: FAIL (no existe `ObraSocialService`).

- [ ] **Step 3: Implementar el servicio**

Create `src/app/features/obras-sociales/services/obra-social.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { InsurerComplete, InsurerSummary, humanizeInsurerType } from '../models/insurer.model';
import { PlanComplete } from '../models/plan.model';
import { Agreement } from '../models/agreement.model';
import { InsurerContactInfo } from '../models/contact-info.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest, ObraSocialPageResult } from '../models/obra-social-page.model';
import { WizardCreate } from '../models/wizard.model';
import { MOCK_INSURERS, INSURER_TYPES, NBU_VERSIONS, CONTACT_TYPES } from './mock-data';

/**
 * Servicio MOCK de Obras Sociales.
 * Mantiene un array en memoria (clon del seed) → persiste durante la sesión.
 * Para enchufar el backend: reemplazar cada cuerpo `of(...)` por `this.http.*`
 * (aplicar la skill `ngrx-backend-request`). Las firmas no cambian.
 */
@Injectable({ providedIn: 'root' })
export class ObraSocialService {
  private readonly db: InsurerComplete[] = MOCK_INSURERS.map((o) => structuredClone(o));
  private seq = 10_000;
  private nextId(): number { return ++this.seq; }

  private toSummary(o: InsurerComplete): InsurerSummary {
    return {
      id: o.id, code: o.code, acronym: o.acronym, name: o.name,
      insurerType: o.insurerType, insurerTypeName: o.insurerTypeName, active: o.active,
    };
  }

  search(req: ObraSocialPageRequest): Observable<ObraSocialPageResult> {
    let rows = this.db.slice();
    if (req.state === 'active') rows = rows.filter((o) => o.active);
    else if (req.state === 'inactive') rows = rows.filter((o) => !o.active);
    if (req.insurerType) rows = rows.filter((o) => o.insurerType === req.insurerType);
    if (req.q?.trim()) {
      const q = req.q.trim().toLowerCase();
      rows = rows.filter((o) =>
        o.name.toLowerCase().includes(q) ||
        o.acronym.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q));
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const totalElements = rows.length;
    const { page, size } = req;
    const start = page * size;
    const content = rows.slice(start, start + size).map((o) => this.toSummary(o));
    return of({ content, totalElements, totalPages: size ? Math.ceil(totalElements / size) : 0, page, size });
  }

  getCompleteById(id: number): Observable<InsurerComplete> {
    const found = this.db.find((o) => o.id === id);
    if (!found) {
      return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
    }
    return of(structuredClone(found));
  }

  createFromWizard(payload: WizardCreate): Observable<InsurerComplete> {
    const insurerId = this.nextId();
    const plans: PlanComplete[] = payload.plans.map((pw) => {
      const planId = this.nextId();
      const agreement: Agreement = {
        id: this.nextId(), insurerPlanId: planId, insurerPlanName: pw.plan.name,
        versionNbu: pw.agreement.versionNbu, requiresCopayment: pw.agreement.requiresCopayment,
        coveragePercentage: pw.agreement.coveragePercentage, ubValue: pw.agreement.ubValue,
        validFromDate: pw.agreement.validFromDate, validToDate: null,
      };
      return {
        id: planId, insurerId, insurerName: payload.insurer.name,
        code: pw.plan.code, acronym: pw.plan.acronym, name: pw.plan.name,
        description: pw.plan.description, isActive: true, iva: pw.plan.iva,
        actualAgreements: [agreement],
      };
    });
    const contacts: InsurerContactInfo[] = payload.contacts.map((c) => ({
      id: this.nextId(), insurerId, contactType: c.contactType, contact: c.contact, isActive: true,
    }));
    const created: InsurerComplete = {
      id: insurerId, code: payload.insurer.code, name: payload.insurer.name,
      acronym: payload.insurer.acronym, insurerType: payload.insurer.insurerType,
      insurerTypeName: humanizeInsurerType(payload.insurer.insurerType),
      description: payload.insurer.description, authorizationUrl: payload.insurer.authorizationUrl,
      active: true, specificData: payload.insurer.specificData, plans, contacts,
    };
    this.db.push(created);
    return of(structuredClone(created));
  }

  getInsurerTypes(): Observable<InsurerType[]> { return of(INSURER_TYPES.map((x) => ({ ...x }))); }
  getNbuVersions(): Observable<NbuVersion[]> { return of(NBU_VERSIONS.map((x) => ({ ...x }))); }
  getContactTypes(): Observable<ContactType[]> { return of(CONTACT_TYPES.map((x) => ({ ...x }))); }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/app/features/obras-sociales/services/obra-social.service.spec.ts`
Expected: PASS (8 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/obras-sociales/services
git commit -m "feat(obras-sociales): servicio mock con store en memoria + tests"
```

---

## Task 4: Store — state + actions

**Files:**
- Create: `src/app/features/obras-sociales/store/obra-social.state.ts`
- Create: `src/app/features/obras-sociales/store/obra-social.actions.ts`

- [ ] **Step 1: Crear `obra-social.state.ts`**

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { InsurerComplete, InsurerSummary } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest } from '../models/obra-social-page.model';

export interface ObraSocialState {
  items: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  pageRequest: ObraSocialPageRequest;
  selected: InsurerComplete | null;
  insurerTypes: InsurerType[];
  nbuVersions: NbuVersion[];
  contactTypes: ContactType[];
  pending: boolean;
  creating: boolean;
  error: HttpErrorResponse | null;
}

export const initialObraSocialState: ObraSocialState = {
  items: [],
  totalElements: 0,
  totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  selected: null,
  insurerTypes: [],
  nbuVersions: [],
  contactTypes: [],
  pending: false,
  creating: false,
  error: null,
};

export const OBRA_SOCIAL_FEATURE_KEY = 'obrasSociales';
```

- [ ] **Step 2: Crear `obra-social.actions.ts`**

```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { InsurerComplete } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest, ObraSocialPageResult } from '../models/obra-social-page.model';
import { WizardCreate } from '../models/wizard.model';

// --- Listado (read) ---
export const loadObrasSociales = createAction(
  '[Obras Sociales Page] Load',
  props<{ req: ObraSocialPageRequest }>(),
);
export const loadObrasSocialesSuccess = createAction(
  '[Obras Sociales API] Load Success',
  props<{ result: ObraSocialPageResult }>(),
);
export const loadObrasSocialesFailure = createAction(
  '[Obras Sociales API] Load Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const setObraSocialPageRequest = createAction(
  '[Obras Sociales Page] Set Page Request',
  props<{ patch: Partial<ObraSocialPageRequest> }>(),
);

// --- Detalle (read) ---
export const loadObraSocial = createAction(
  '[Obra Social Detail] Load',
  props<{ id: number }>(),
);
export const loadObraSocialSuccess = createAction(
  '[Obras Sociales API] Load Detail Success',
  props<{ insurer: InsurerComplete }>(),
);
export const loadObraSocialFailure = createAction(
  '[Obras Sociales API] Load Detail Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearSelectedObraSocial = createAction('[Obra Social Detail] Clear Selected');

// --- Alta (submit, exhaustMap) ---
export const createObraSocial = createAction(
  '[Obra Social Form] Create',
  props<{ payload: WizardCreate }>(),
);
export const createObraSocialSuccess = createAction(
  '[Obras Sociales API] Create Success',
  props<{ insurer: InsurerComplete }>(),
);
export const createObraSocialFailure = createAction(
  '[Obras Sociales API] Create Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Catálogos ---
export const loadObraSocialCatalogs = createAction('[Obras Sociales] Load Catalogs');
export const loadObraSocialCatalogsSuccess = createAction(
  '[Obras Sociales API] Load Catalogs Success',
  props<{ insurerTypes: InsurerType[]; nbuVersions: NbuVersion[]; contactTypes: ContactType[] }>(),
);
export const loadObraSocialCatalogsFailure = createAction(
  '[Obras Sociales API] Load Catalogs Failure',
  props<{ error: HttpErrorResponse }>(),
);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/obras-sociales/store/obra-social.state.ts src/app/features/obras-sociales/store/obra-social.actions.ts
git commit -m "feat(obras-sociales): NgRx state + actions"
```

---

## Task 5: Reducer (TDD)

**Files:**
- Create: `src/app/features/obras-sociales/store/obra-social.reducer.spec.ts`
- Create: `src/app/features/obras-sociales/store/obra-social.reducer.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/app/features/obras-sociales/store/obra-social.reducer.spec.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { obraSocialReducer } from './obra-social.reducer';
import { initialObraSocialState } from './obra-social.state';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, clearSelectedObraSocial,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogsSuccess,
} from './obra-social.actions';
import { InsurerComplete, InsurerSummary } from '../models/insurer.model';

const summary = (id: number, active = true): InsurerSummary => ({
  id, code: `C${id}`, acronym: `A${id}`, name: `OS ${id}`,
  insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active,
});
const complete = (id: number): InsurerComplete => ({
  id, code: `C${id}`, name: `OS ${id}`, acronym: `A${id}`,
  insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true,
  plans: [], contacts: [],
});

describe('obraSocialReducer', () => {
  it('loadObrasSociales pone pending=true y limpia error', () => {
    const before = { ...initialObraSocialState, error: { status: 500 } as HttpErrorResponse };
    const next = obraSocialReducer(before, loadObrasSociales({ req: initialObraSocialState.pageRequest }));
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadObrasSocialesSuccess reemplaza items y totales', () => {
    const result = { content: [summary(1)], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObrasSocialesSuccess({ result }));
    expect(next.items.length).toBe(1);
    expect(next.totalElements).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadObrasSocialesFailure guarda error y limpia pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObrasSocialesFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('setObraSocialPageRequest mergea el patch', () => {
    const next = obraSocialReducer(initialObraSocialState, setObraSocialPageRequest({ patch: { q: 'os', page: 2 } }));
    expect(next.pageRequest).toEqual({ ...initialObraSocialState.pageRequest, q: 'os', page: 2 });
  });

  it('loadObraSocialSuccess guarda selected y limpia pending', () => {
    const next = obraSocialReducer({ ...initialObraSocialState, pending: true }, loadObraSocialSuccess({ insurer: complete(7) }));
    expect(next.selected?.id).toBe(7);
    expect(next.pending).toBe(false);
  });

  it('clearSelectedObraSocial pone selected=null', () => {
    const next = obraSocialReducer({ ...initialObraSocialState, selected: complete(1) }, clearSelectedObraSocial());
    expect(next.selected).toBeNull();
  });

  it('createObraSocial pone creating=true; success lo limpia', () => {
    const dummyPayload = { insurer: { code: '', name: '', acronym: '', insurerType: 'SOCIAL' as const, specificData: null }, plans: [], contacts: [] };
    const after = obraSocialReducer(initialObraSocialState, createObraSocial({ payload: dummyPayload }));
    expect(after.creating).toBe(true);
    const done = obraSocialReducer(after, createObraSocialSuccess({ insurer: complete(1) }));
    expect(done.creating).toBe(false);
  });

  it('createObraSocialFailure guarda error y limpia creating', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = obraSocialReducer({ ...initialObraSocialState, creating: true }, createObraSocialFailure({ error: err }));
    expect(next.creating).toBe(false);
    expect(next.error).toBe(err);
  });

  it('loadObraSocialCatalogsSuccess guarda los 3 catálogos', () => {
    const next = obraSocialReducer(initialObraSocialState, loadObraSocialCatalogsSuccess({
      insurerTypes: [{ name: 'SOCIAL', description: 'Obra Social' }],
      nbuVersions: [{ id: 1, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' }],
      contactTypes: [{ name: 'PHONE', description: 'Teléfono' }],
    }));
    expect(next.insurerTypes.length).toBe(1);
    expect(next.nbuVersions.length).toBe(1);
    expect(next.contactTypes.length).toBe(1);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.reducer.spec.ts`
Expected: FAIL (no existe `obraSocialReducer`).

- [ ] **Step 3: Implementar el reducer**

Create `src/app/features/obras-sociales/store/obra-social.reducer.ts`:

```typescript
import { createReducer, on } from '@ngrx/store';
import { ObraSocialState, initialObraSocialState } from './obra-social.state';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, loadObraSocialFailure, clearSelectedObraSocial,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogsSuccess,
} from './obra-social.actions';

export const obraSocialReducer = createReducer(
  initialObraSocialState,

  // Intent: pending / creating
  on(loadObrasSociales, (state): ObraSocialState => ({ ...state, pending: true, error: null })),
  on(loadObraSocial, (state): ObraSocialState => ({ ...state, pending: true, error: null })),
  on(createObraSocial, (state): ObraSocialState => ({ ...state, creating: true, error: null })),

  // Success
  on(loadObrasSocialesSuccess, (state, { result }): ObraSocialState => ({
    ...state,
    items: result.content,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(loadObraSocialSuccess, (state, { insurer }): ObraSocialState => ({
    ...state, selected: insurer, pending: false, error: null,
  })),
  on(createObraSocialSuccess, (state): ObraSocialState => ({
    ...state, creating: false, error: null,
  })),
  on(loadObraSocialCatalogsSuccess, (state, { insurerTypes, nbuVersions, contactTypes }): ObraSocialState => ({
    ...state, insurerTypes, nbuVersions, contactTypes,
  })),

  // Failure
  on(loadObrasSocialesFailure, (state, { error }): ObraSocialState => ({ ...state, pending: false, error })),
  on(loadObraSocialFailure, (state, { error }): ObraSocialState => ({ ...state, pending: false, error })),
  on(createObraSocialFailure, (state, { error }): ObraSocialState => ({ ...state, creating: false, error })),

  // UI misc
  on(setObraSocialPageRequest, (state, { patch }): ObraSocialState => ({
    ...state, pageRequest: { ...state.pageRequest, ...patch },
  })),
  on(clearSelectedObraSocial, (state): ObraSocialState => ({ ...state, selected: null })),
);
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.reducer.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/obras-sociales/store/obra-social.reducer.ts src/app/features/obras-sociales/store/obra-social.reducer.spec.ts
git commit -m "feat(obras-sociales): reducer + tests"
```

---

## Task 6: Selectors (TDD)

**Files:**
- Create: `src/app/features/obras-sociales/store/obra-social.selectors.spec.ts`
- Create: `src/app/features/obras-sociales/store/obra-social.selectors.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/app/features/obras-sociales/store/obra-social.selectors.spec.ts`:

```typescript
import {
  selectObraSocialItems, selectObraSocialPending, selectObraSocialPageRequest,
  selectSelectedObraSocial, selectObraSocialInsurerTypes, selectNbuOptions,
} from './obra-social.selectors';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from './obra-social.state';

describe('obra-social selectors', () => {
  const state = {
    [OBRA_SOCIAL_FEATURE_KEY]: {
      ...initialObraSocialState,
      items: [{ id: 1 } as never],
      pending: true,
      insurerTypes: [{ name: 'SOCIAL', description: 'Obra Social' }],
      nbuVersions: [
        { id: 1, versionCode: '2017_2020', publicationYear: 2017, effectivityDate: '2017-01-01' },
        { id: 2, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' },
      ],
    },
  } as never;

  it('selectObraSocialItems devuelve items', () => {
    expect(selectObraSocialItems(state)).toEqual([{ id: 1 }]);
  });

  it('selectObraSocialPending devuelve el flag', () => {
    expect(selectObraSocialPending(state)).toBe(true);
  });

  it('selectObraSocialPageRequest devuelve el page request', () => {
    expect(selectObraSocialPageRequest(state)).toEqual(initialObraSocialState.pageRequest);
  });

  it('selectSelectedObraSocial devuelve null cuando no hay selección', () => {
    expect(selectSelectedObraSocial(state)).toBeNull();
  });

  it('selectObraSocialInsurerTypes devuelve el catálogo', () => {
    expect(selectObraSocialInsurerTypes(state).length).toBe(1);
  });

  it('selectNbuOptions deriva {label,value} ordenado por año desc', () => {
    const opts = selectNbuOptions(state);
    expect(opts[0]).toEqual({ label: '2021_2024', value: 2 });
    expect(opts[1]).toEqual({ label: '2017_2020', value: 1 });
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.selectors.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar los selectors**

Create `src/app/features/obras-sociales/store/obra-social.selectors.ts`:

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OBRA_SOCIAL_FEATURE_KEY, ObraSocialState } from './obra-social.state';
import { NbuOption } from '../models/catalogs.model';

export const selectObraSocialState = createFeatureSelector<ObraSocialState>(OBRA_SOCIAL_FEATURE_KEY);

export const selectObraSocialItems = createSelector(selectObraSocialState, (s) => s.items);
export const selectObraSocialTotalElements = createSelector(selectObraSocialState, (s) => s.totalElements);
export const selectObraSocialPageRequest = createSelector(selectObraSocialState, (s) => s.pageRequest);
export const selectObraSocialPending = createSelector(selectObraSocialState, (s) => s.pending);
export const selectObraSocialCreating = createSelector(selectObraSocialState, (s) => s.creating);
export const selectSelectedObraSocial = createSelector(selectObraSocialState, (s) => s.selected);
export const selectObraSocialInsurerTypes = createSelector(selectObraSocialState, (s) => s.insurerTypes);
export const selectObraSocialContactTypes = createSelector(selectObraSocialState, (s) => s.contactTypes);

export const selectNbuOptions = createSelector(selectObraSocialState, (s): NbuOption[] =>
  [...s.nbuVersions]
    .sort((a, b) => b.publicationYear - a.publicationYear)
    .map((v) => ({ label: v.versionCode, value: v.id })),
);
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.selectors.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/obras-sociales/store/obra-social.selectors.ts src/app/features/obras-sociales/store/obra-social.selectors.spec.ts
git commit -m "feat(obras-sociales): selectors + tests"
```

---

## Task 7: Effects (TDD)

**Files:**
- Create: `src/app/features/obras-sociales/store/obra-social.effects.spec.ts`
- Create: `src/app/features/obras-sociales/store/obra-social.effects.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `src/app/features/obras-sociales/store/obra-social.effects.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { ObraSocialEffects } from './obra-social.effects';
import { ObraSocialService } from '../services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  loadObraSocial, loadObraSocialSuccess,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogs, loadObraSocialCatalogsSuccess,
} from './obra-social.actions';
import { initialObraSocialState, OBRA_SOCIAL_FEATURE_KEY } from './obra-social.state';
import { InsurerComplete } from '../models/insurer.model';
import { WizardCreate } from '../models/wizard.model';

const insurer: InsurerComplete = {
  id: 1, code: 'C', name: 'OS', acronym: 'A', insurerType: 'SOCIAL',
  insurerTypeName: 'Obra Social', active: true, plans: [], contacts: [],
};
const wizard: WizardCreate = {
  insurer: { code: 'C', name: 'OS', acronym: 'A', insurerType: 'SOCIAL', specificData: null },
  plans: [], contacts: [],
};

describe('ObraSocialEffects', () => {
  let actions$: Observable<Action>;
  let svc: {
    search: ReturnType<typeof vi.fn>; getCompleteById: ReturnType<typeof vi.fn>;
    createFromWizard: ReturnType<typeof vi.fn>;
    getInsurerTypes: ReturnType<typeof vi.fn>; getNbuVersions: ReturnType<typeof vi.fn>;
    getContactTypes: ReturnType<typeof vi.fn>;
  };
  const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), show: vi.fn(), dismiss: vi.fn(), clear: vi.fn() };

  beforeEach(() => {
    svc = {
      search: vi.fn(), getCompleteById: vi.fn(), createFromWizard: vi.fn(),
      getInsurerTypes: vi.fn(), getNbuVersions: vi.fn(), getContactTypes: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ObraSocialEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        { provide: ObraSocialService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadObrasSociales$ mapea a success', () =>
    new Promise<void>((resolve) => {
      svc.search.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }));
      actions$ = of(loadObrasSociales({ req: initialObraSocialState.pageRequest }));
      TestBed.inject(ObraSocialEffects).loadObrasSociales$.subscribe((a) => {
        expect(a.type).toBe(loadObrasSocialesSuccess.type);
        resolve();
      });
    }));

  it('loadObrasSociales$ mapea error a failure y notifica', () =>
    new Promise<void>((resolve) => {
      svc.search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      actions$ = of(loadObrasSociales({ req: initialObraSocialState.pageRequest }));
      TestBed.inject(ObraSocialEffects).loadObrasSociales$.subscribe((a) => {
        expect(a.type).toBe(loadObrasSocialesFailure.type);
        expect(notify.error).toHaveBeenCalled();
        resolve();
      });
    }));

  it('loadObraSocial$ mapea a success', () =>
    new Promise<void>((resolve) => {
      svc.getCompleteById.mockReturnValue(of(insurer));
      actions$ = of(loadObraSocial({ id: 1 }));
      TestBed.inject(ObraSocialEffects).loadObraSocial$.subscribe((a) => {
        expect(a.type).toBe(loadObraSocialSuccess.type);
        resolve();
      });
    }));

  it('createObraSocial$ mapea a success y notifica éxito', () =>
    new Promise<void>((resolve) => {
      svc.createFromWizard.mockReturnValue(of(insurer));
      actions$ = of(createObraSocial({ payload: wizard }));
      TestBed.inject(ObraSocialEffects).createObraSocial$.subscribe((a) => {
        expect(a.type).toBe(createObraSocialSuccess.type);
        expect(notify.success).toHaveBeenCalled();
        resolve();
      });
    }));

  it('createObraSocial$ mapea error a failure y notifica', () =>
    new Promise<void>((resolve) => {
      svc.createFromWizard.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      actions$ = of(createObraSocial({ payload: wizard }));
      TestBed.inject(ObraSocialEffects).createObraSocial$.subscribe((a) => {
        expect(a.type).toBe(createObraSocialFailure.type);
        expect(notify.error).toHaveBeenCalled();
        resolve();
      });
    }));

  it('loadObraSocialCatalogs$ combina los 3 catálogos en success', () =>
    new Promise<void>((resolve) => {
      svc.getInsurerTypes.mockReturnValue(of([{ name: 'SOCIAL', description: 'Obra Social' }]));
      svc.getNbuVersions.mockReturnValue(of([{ id: 1, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' }]));
      svc.getContactTypes.mockReturnValue(of([{ name: 'PHONE', description: 'Teléfono' }]));
      actions$ = of(loadObraSocialCatalogs());
      TestBed.inject(ObraSocialEffects).loadObraSocialCatalogs$.subscribe((a) => {
        expect(a.type).toBe(loadObraSocialCatalogsSuccess.type);
        resolve();
      });
    }));
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.effects.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar los effects**

Create `src/app/features/obras-sociales/store/obra-social.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, exhaustMap, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';
import { ObraSocialService } from '../services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadObrasSociales, loadObrasSocialesSuccess, loadObrasSocialesFailure,
  setObraSocialPageRequest,
  loadObraSocial, loadObraSocialSuccess, loadObraSocialFailure,
  createObraSocial, createObraSocialSuccess, createObraSocialFailure,
  loadObraSocialCatalogs, loadObraSocialCatalogsSuccess, loadObraSocialCatalogsFailure,
} from './obra-social.actions';
import { selectObraSocialPageRequest } from './obra-social.selectors';

@Injectable()
export class ObraSocialEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(ObraSocialService);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);

  loadObrasSociales$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObrasSociales),
      switchMap(({ req }) =>
        this.service.search(req).pipe(
          map((result) => loadObrasSocialesSuccess({ result })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar las obras sociales.');
            return of(loadObrasSocialesFailure({ error }));
          }),
        ),
      ),
    ),
  );

  /** Al cambiar filtros/página, refetch con el page request mergeado del store. */
  setPageRequestPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setObraSocialPageRequest),
      withLatestFrom(this.store.select(selectObraSocialPageRequest)),
      map(([, req]) => loadObrasSociales({ req })),
    ),
  );

  loadObraSocial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObraSocial),
      switchMap(({ id }) =>
        this.service.getCompleteById(id).pipe(
          map((insurer) => loadObraSocialSuccess({ insurer })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se encontró la obra social.');
            return of(loadObraSocialFailure({ error }));
          }),
        ),
      ),
    ),
  );

  createObraSocial$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createObraSocial),
      exhaustMap(({ payload }) =>
        this.service.createFromWizard(payload).pipe(
          map((insurer) => {
            this.notifications.success('La obra social se creó correctamente.');
            return createObraSocialSuccess({ insurer });
          }),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo crear la obra social.');
            return of(createObraSocialFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadObraSocialCatalogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadObraSocialCatalogs),
      switchMap(() =>
        forkJoin({
          insurerTypes: this.service.getInsurerTypes(),
          nbuVersions: this.service.getNbuVersions(),
          contactTypes: this.service.getContactTypes(),
        }).pipe(
          map(({ insurerTypes, nbuVersions, contactTypes }) =>
            loadObraSocialCatalogsSuccess({ insurerTypes, nbuVersions, contactTypes }),
          ),
          catchError((error: HttpErrorResponse) => of(loadObraSocialCatalogsFailure({ error }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/app/features/obras-sociales/store/obra-social.effects.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/obras-sociales/store/obra-social.effects.ts src/app/features/obras-sociales/store/obra-social.effects.spec.ts
git commit -m "feat(obras-sociales): effects + tests"
```

---

## Task 8: Wiring de rutas + borrar placeholder

**Files:**
- Modify: `src/app/features/obras-sociales/obras-sociales.routes.ts`
- Delete: `src/app/features/obras-sociales/pages/obras-sociales/obras-sociales.page.ts` (y su carpeta)

- [ ] **Step 1: Reescribir `obras-sociales.routes.ts`** (registra el store a nivel ruta + 3 pantallas)

```typescript
import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { OBRA_SOCIAL_FEATURE_KEY } from './store/obra-social.state';
import { obraSocialReducer } from './store/obra-social.reducer';
import { ObraSocialEffects } from './store/obra-social.effects';

export const OBRAS_SOCIALES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(OBRA_SOCIAL_FEATURE_KEY, obraSocialReducer),
      provideEffects(ObraSocialEffects),
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/obras-sociales-list/obras-sociales-list.page').then((m) => m.ObrasSocialesListPage),
      },
      {
        path: 'nueva',
        loadComponent: () =>
          import('./pages/obra-social-form/obra-social-form.page').then((m) => m.ObraSocialFormPage),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/obra-social-detail/obra-social-detail.page').then((m) => m.ObraSocialDetailPage),
      },
    ],
  },
];
```

- [ ] **Step 2: Borrar el placeholder**

```bash
git rm -r src/app/features/obras-sociales/pages/obras-sociales
```

> NOTA: tras este paso el proyecto NO compila hasta crear las 3 páginas (Tasks 9-13). Es esperado. Los `loadComponent` apuntan a archivos que se crean a continuación. No correr `npm run build` todavía.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/obras-sociales/obras-sociales.routes.ts
git commit -m "feat(obras-sociales): rutas (listado/alta/detalle) + store a nivel ruta; quita placeholder"
```

---

## Task 9: Pantalla 1 — Listado (tabla)

**Files:**
- Create: `src/app/features/obras-sociales/pages/obras-sociales-list/obras-sociales-list.page.ts`
- Create: `src/app/features/obras-sociales/pages/obras-sociales-list/obras-sociales-list.page.spec.ts`

- [ ] **Step 1: Crear la página** (calcada de `patient-list.page.ts`)

```typescript
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, debounceTime } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { InsurerStateFilter } from '../../models/obra-social-page.model';
import { InsurerTypeCode } from '../../models/insurer.model';
import { setObraSocialPageRequest, loadObraSocialCatalogs } from '../../store/obra-social.actions';
import {
  selectObraSocialItems, selectObraSocialPending, selectObraSocialPageRequest,
  selectObraSocialTotalElements, selectObraSocialInsurerTypes,
} from '../../store/obra-social.selectors';

interface TypeOption { label: string; value: InsurerTypeCode | null; }

@Component({
  selector: 'os-obras-sociales-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule, TableModule, ButtonModule, InputTextModule, SelectModule,
    TagModule, TooltipModule, EmptyStateComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Gestión</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-id-card"></i> Obras Sociales</h1>
        </div>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          <a [routerLink]="['/obras-sociales', 'nueva']">
            <p-button label="Nueva obra social" icon="pi pi-plus" />
          </a>
        </div>
      </header>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText placeholder="Buscar por nombre, sigla o código…" (input)="onSearch($any($event.target).value)" />
        </span>
        @for (opt of stateOptions; track opt.value) {
          <p-button
            [label]="opt.label"
            size="small"
            [severity]="pageRequest().state === opt.value ? 'primary' : 'secondary'"
            [outlined]="pageRequest().state !== opt.value"
            (onClick)="setState(opt.value)" />
        }
        <p-select
          [options]="typeOptions()"
          optionLabel="label"
          optionValue="value"
          [ngModel]="pageRequest().insurerType ?? null"
          (onChange)="onType($event.value)"
          placeholder="Tipo"
          styleClass="w-48" />
      </div>

      <p-table
        [value]="items()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageRequest().size"
        [totalRecords]="total()"
        [first]="pageRequest().page * pageRequest().size"
        [loading]="pending()"
        (onLazyLoad)="onPage($event)"
        dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Código</th><th>Sigla</th><th>Nombre</th><th>Tipo</th><th>Estado</th>
              <th class="text-right" style="width:120px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-o>
            <tr>
              <td>{{ o.code }}</td>
              <td>{{ o.acronym }}</td>
              <td class="font-medium">{{ o.name }}</td>
              <td>{{ o.insurerTypeName }}</td>
              <td>
                @if (o.active) {
                  <p-tag severity="success" value="Activa" />
                } @else {
                  <p-tag severity="danger" value="Inactiva" />
                }
              </td>
              <td class="text-right">
                <a [routerLink]="['/obras-sociales', o.id]">
                  <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
                </a>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6">
                <a [routerLink]="['/obras-sociales', 'nueva']">
                  <ui-empty-state heading="Sin obras sociales" icon="pi-id-card" ctaLabel="Nueva obra social" />
                </a>
              </td>
            </tr>
          </ng-template>
        </p-table>
    </div>
  `,
})
export class ObrasSocialesListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly search$ = new Subject<string>();

  readonly items = this.store.selectSignal(selectObraSocialItems);
  readonly pending = this.store.selectSignal(selectObraSocialPending);
  readonly total = this.store.selectSignal(selectObraSocialTotalElements);
  readonly pageRequest = this.store.selectSignal(selectObraSocialPageRequest);
  private readonly insurerTypes = this.store.selectSignal(selectObraSocialInsurerTypes);

  readonly stateOptions: { value: InsurerStateFilter; label: string }[] = [
    { value: 'active', label: 'Activas' },
    { value: 'inactive', label: 'Inactivas' },
    { value: 'all', label: 'Todas' },
  ];

  readonly typeOptions = computed<TypeOption[]>(() => [
    { label: 'Todos los tipos', value: null },
    ...this.insurerTypes().map((t) => ({ label: t.description, value: t.name })),
  ]);

  ngOnInit(): void {
    this.store.dispatch(loadObraSocialCatalogs());
    this.search$.pipe(debounceTime(300)).subscribe((q) =>
      this.store.dispatch(setObraSocialPageRequest({ patch: { q, page: 0 } })),
    );
  }

  onSearch(q: string): void { this.search$.next(q); }

  setState(state: InsurerStateFilter): void {
    this.store.dispatch(setObraSocialPageRequest({ patch: { state, page: 0 } }));
  }

  onType(value: InsurerTypeCode | null): void {
    this.store.dispatch(setObraSocialPageRequest({ patch: { insurerType: value ?? undefined, page: 0 } }));
  }

  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setObraSocialPageRequest({ patch: { page, size: rows } }));
  }
}
```

- [ ] **Step 2: Crear el smoke test**

Create `src/app/features/obras-sociales/pages/obras-sociales-list/obras-sociales-list.page.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ObrasSocialesListPage } from './obras-sociales-list.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { setObraSocialPageRequest, loadObraSocialCatalogs } from '../../store/obra-social.actions';

describe('ObrasSocialesListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ObrasSocialesListPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('despacha loadObraSocialCatalogs en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(ObrasSocialesListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadObraSocialCatalogs());
  });

  it('setState despacha setObraSocialPageRequest con state y page=0', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.setState('inactive');
    expect(spy).toHaveBeenCalledWith(setObraSocialPageRequest({ patch: { state: 'inactive', page: 0 } }));
  });

  it('onPage mapea first/rows a page/size', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onPage({ first: 40, rows: 20 });
    expect(spy).toHaveBeenCalledWith(setObraSocialPageRequest({ patch: { page: 2, size: 20 } }));
  });

  it('renderiza routerLink a /obras-sociales/nueva', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/href="[^"]*\/obras-sociales\/nueva"/);
  });
});
```

- [ ] **Step 3: Correr el smoke test**

Run: `npx vitest run src/app/features/obras-sociales/pages/obras-sociales-list/obras-sociales-list.page.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/obras-sociales/pages/obras-sociales-list
git commit -m "feat(obras-sociales): pantalla de listado (tabla) + smoke test"
```

---

## Task 10: Stepper — modelo de pasos + header

**Files:**
- Create: `src/app/features/obras-sociales/pages/obra-social-form/obra-social-form-steps.ts`
- Create: `src/app/features/obras-sociales/pages/obra-social-form/components/stepper-header/obra-social-stepper-header.component.ts`

- [ ] **Step 1: Crear `obra-social-form-steps.ts`**

```typescript
export type ObraSocialFormStepKey = 'aseguradora' | 'planes' | 'resumen';

export interface ObraSocialFormStep {
  readonly key: ObraSocialFormStepKey;
  readonly title: string;
  readonly subtitle: string;
}

export const OBRA_SOCIAL_FORM_STEPS: readonly ObraSocialFormStep[] = [
  { key: 'aseguradora', title: 'Aseguradora', subtitle: 'Datos + contacto' },
  { key: 'planes', title: 'Planes y convenios', subtitle: 'Al menos uno' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisar y confirmar' },
] as const;
```

- [ ] **Step 2: Crear el stepper header** (calcado de `FormStepperHeaderComponent`, tipado a `ObraSocialFormStep`)

Create `src/app/features/obras-sociales/pages/obra-social-form/components/stepper-header/obra-social-stepper-header.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ObraSocialFormStep } from '../../obra-social-form-steps';

@Component({
  selector: 'os-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="os-stepper" role="list">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) {
          <li class="os-stepper__connector" [class.is-done]="isDone(i - 1)" aria-hidden="true"></li>
        }
        <li
          class="os-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.aria-current]="i === currentIndex() ? 'step' : null"
          [attr.role]="isClickable(i) ? 'button' : null"
          [attr.tabindex]="isClickable(i) ? 0 : null"
          [attr.aria-label]="ariaLabelFor(step, i)"
          (click)="onClick(i)"
          (keydown.enter)="onKey($event, i)"
          (keydown.space)="onKey($event, i)"
        >
          <span class="os-stepper__num" aria-hidden="true">
            @if (isDone(i)) { ✓ } @else { {{ i + 1 }} }
          </span>
          <span class="os-stepper__lbl">
            <span class="os-stepper__title">{{ step.title }}</span>
            <span class="os-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { --os-line:#e2e8f0; --os-muted:#64748b; --os-mute2:#94a3b8; --os-hover:#f1f5f9; --os-text:var(--ds-text,#1a1a2e); --os-primary:var(--brand-primary,#2563eb); --os-success:var(--ds-success,#22c55e); }
    .os-stepper { display:flex; align-items:center; gap:10px; list-style:none; margin:0; padding:16px 28px; border-bottom:1px solid var(--os-line); background:#fff; }
    .os-stepper__item { display:flex; align-items:center; gap:10px; color:var(--os-muted); cursor:default; padding:6px 10px; border-radius:8px; transition:background 120ms ease; }
    .os-stepper__item.is-clickable { cursor:pointer; }
    .os-stepper__item.is-clickable:hover { background:var(--os-hover); }
    .os-stepper__num { width:28px; height:28px; flex:0 0 28px; border-radius:50%; border:1.5px solid var(--os-line); display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#fff; color:var(--os-muted); }
    .os-stepper__item.is-done .os-stepper__num { background:var(--os-success); border-color:var(--os-success); color:#fff; }
    .os-stepper__item.is-done { color:var(--os-text); }
    .os-stepper__item.is-current .os-stepper__num { background:var(--os-primary); border-color:var(--os-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--os-primary) 18%, transparent); }
    .os-stepper__item.is-current { color:var(--os-primary); font-weight:600; }
    .os-stepper__item.is-locked { color:var(--os-mute2); }
    .os-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.2; }
    .os-stepper__title { font-size:13px; font-weight:600; }
    .os-stepper__sub { font-size:11px; font-weight:400; color:var(--os-muted); }
    .os-stepper__connector { flex:1; height:2px; background:var(--os-line); margin:0 2px; border-radius:2px; transition:background 200ms ease; }
    .os-stepper__connector.is-done { background:var(--os-success); }
  `],
})
export class ObraSocialStepperHeaderComponent {
  readonly steps = input.required<readonly ObraSocialFormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void { if (this.isClickable(i)) this.stepSelected.emit(i); }
  onKey(event: Event, i: number): void {
    if (!this.isClickable(i)) return;
    event.preventDefault();
    this.stepSelected.emit(i);
  }
  ariaLabelFor(step: ObraSocialFormStep, i: number): string {
    const total = this.steps().length;
    const status = i === this.currentIndex() ? 'actual' : this.isDone(i) ? 'completado' : 'bloqueado';
    return `Paso ${i + 1} de ${total}: ${step.title} (${status})`;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/obras-sociales/pages/obra-social-form/obra-social-form-steps.ts src/app/features/obras-sociales/pages/obra-social-form/components
git commit -m "feat(obras-sociales): stepper header + modelo de pasos"
```

---

## Task 11: Stepper — componentes de paso

**Files:**
- Create: `src/app/features/obras-sociales/pages/obra-social-form/steps/aseguradora-step.component.ts`
- Create: `src/app/features/obras-sociales/pages/obra-social-form/steps/planes-step.component.ts`
- Create: `src/app/features/obras-sociales/pages/obra-social-form/steps/resumen-step.component.ts`

- [ ] **Step 1: Crear `aseguradora-step.component.ts`** (recibe el FormGroup `aseguradora`)

```typescript
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'os-aseguradora-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, TextareaModule],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-2 gap-4 max-w-3xl">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Código *</label>
        <input pInputText formControlName="code" maxlength="20" placeholder="Ej. OSDE" />
        @if (showError('code')) { <small class="text-red-600">El código es obligatorio (máx. 20).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Sigla *</label>
        <input pInputText formControlName="acronym" maxlength="10" placeholder="Ej. OSDE" />
        @if (showError('acronym')) { <small class="text-red-600">La sigla es obligatoria (máx. 10).</small> }
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">Nombre *</label>
        <input pInputText formControlName="name" maxlength="100" placeholder="Nombre de la obra social" />
        @if (showError('name')) { <small class="text-red-600">El nombre es obligatorio (3 a 100 caracteres).</small> }
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Tipo *</label>
        <p-select formControlName="insurerType" [options]="typeOptions" optionLabel="label" optionValue="value" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">CUIT *</label>
        <input pInputText formControlName="cuit" placeholder="30-12345678-9" />
        @if (showError('cuit')) { <small class="text-red-600">Ingresá un CUIT válido (formato 30-12345678-9).</small> }
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">URL de autorización</label>
        <input pInputText formControlName="authorizationUrl" maxlength="255" placeholder="https://…" />
      </div>

      <div class="flex flex-col gap-1 col-span-2">
        <label class="text-sm font-medium">Descripción</label>
        <textarea pTextarea formControlName="description" rows="2" maxlength="255"></textarea>
      </div>

      <div class="col-span-2 mt-2 text-xs text-surface-500">Contacto (opcional)</div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Teléfono</label>
        <input pInputText formControlName="phone" placeholder="0810-…" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Email</label>
        <input pInputText formControlName="email" placeholder="contacto@…" />
        @if (showError('email')) { <small class="text-red-600">Ingresá un email válido.</small> }
      </div>
    </div>
  `,
})
export class AseguradoraStepComponent {
  readonly group = input.required<FormGroup>();

  readonly typeOptions = [
    { label: 'Obra Social', value: 'SOCIAL' },
    { label: 'Prepaga', value: 'PRIVATE' },
  ];

  showError(controlName: string): boolean {
    const c = this.group().get(controlName);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
```

> NOTA: `TextareaModule` y la directiva `pTextarea` son de PrimeNG 21 (`primeng/textarea`). `SelectModule` de `primeng/select`.

- [ ] **Step 2: Crear `planes-step.component.ts`** (gestiona el FormArray de planes con add/remove)

```typescript
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { NbuOption } from '../../../models/catalogs.model';

@Component({
  selector: 'os-planes-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, SelectModule, CurrencyArPipe],
  template: `
    <div class="max-w-4xl">
      <h3 class="text-base font-semibold mb-2">Agregar plan</h3>
      <div [formGroup]="draft" class="grid grid-cols-3 gap-3 mb-2">
        <input pInputText formControlName="code" placeholder="Código *" maxlength="20" />
        <input pInputText formControlName="acronym" placeholder="Sigla *" maxlength="10" />
        <input pInputText formControlName="name" placeholder="Nombre *" maxlength="100" />
        <label class="flex flex-col gap-1 text-xs text-surface-500">Vigente desde *
          <input type="date" pInputText formControlName="validFromDate" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">Versión NBU *
          <p-select formControlName="versionNbu" [options]="nbuOptions()" optionLabel="label" optionValue="value" placeholder="NBU" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">Valor U.B. *
          <input type="number" pInputText formControlName="ubValue" min="0" step="0.01" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">% Cobertura *
          <input type="number" pInputText formControlName="coveragePercentage" min="0" max="100" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">IVA % *
          <input type="number" pInputText formControlName="iva" min="0" max="100" />
        </label>
        <div class="flex items-end">
          <p-button label="Agregar plan" icon="pi pi-plus" size="small" (onClick)="addPlan()" [disabled]="draft.invalid" />
        </div>
      </div>
      @if (dupError()) { <small class="text-red-600 block mb-2">Ya hay un plan con ese código.</small> }

      <p-table [value]="array().controls" dataKey="value.code">
        <ng-template pTemplate="header">
          <tr><th>Código</th><th>Nombre</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>IVA</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-ctrl let-i="rowIndex">
          <tr>
            <td>{{ ctrl.value.code }}</td>
            <td>{{ ctrl.value.name }}</td>
            <td>{{ ctrl.value.validFromDate }}</td>
            <td>{{ nbuLabel(ctrl.value.versionNbu) }}</td>
            <td>{{ ctrl.value.ubValue | currencyAr }}</td>
            <td>{{ ctrl.value.coveragePercentage }}%</td>
            <td>{{ ctrl.value.iva }}%</td>
            <td class="text-right">
              <p-button [text]="true" icon="pi pi-trash" severity="danger" pTooltip="Quitar" (onClick)="removePlan(i)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-surface-500 text-sm py-3">Todavía no agregaste planes. Agregá al menos uno.</td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class PlanesStepComponent {
  private readonly fb = inject(FormBuilder);
  readonly array = input.required<FormArray<FormGroup>>();
  readonly nbuOptions = input.required<NbuOption[]>();
  readonly dupError = signal(false);

  readonly draft: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    acronym: ['', [Validators.required, Validators.maxLength(10)]],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    validFromDate: ['', Validators.required],
    versionNbu: [null, Validators.required],
    ubValue: [null, [Validators.required, Validators.min(0.01)]],
    coveragePercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    iva: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  addPlan(): void {
    if (this.draft.invalid) { this.draft.markAllAsTouched(); return; }
    const v = this.draft.getRawValue() as { code: string };
    const exists = this.array().controls.some((c) => (c.value.code as string)?.toLowerCase() === v.code.toLowerCase());
    if (exists) { this.dupError.set(true); return; }
    this.dupError.set(false);
    this.array().push(this.fb.group({ ...this.draft.getRawValue() }));
    this.draft.reset({ code: '', acronym: '', name: '', validFromDate: '', versionNbu: null, ubValue: null, coveragePercentage: null, iva: null });
  }

  removePlan(i: number): void { this.array().removeAt(i); }

  nbuLabel(value: number): string {
    return this.nbuOptions().find((o) => o.value === value)?.label ?? String(value);
  }
}
```

- [ ] **Step 3: Crear `resumen-step.component.ts`** (solo lectura; recibe una vista ya armada)

```typescript
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';

export interface ResumenPlanView {
  code: string;
  name: string;
  acronym: string;
  validFromDate: string;
  nbuLabel: string;
  ubValue: number;
  coveragePercentage: number;
  iva: number;
}

export interface ResumenView {
  code: string;
  name: string;
  acronym: string;
  insurerTypeLabel: string;
  cuit: string;
  authorizationUrl: string;
  description: string;
  contacts: { label: string; value: string }[];
  plans: ResumenPlanView[];
}

@Component({
  selector: 'os-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, CurrencyArPipe],
  template: `
    <div class="max-w-4xl space-y-5">
      <section>
        <h3 class="text-base font-semibold mb-2">Aseguradora</h3>
        <div class="grid grid-cols-3 gap-3">
          <div><div class="text-xs text-surface-500">Código</div><div>{{ data().code }}</div></div>
          <div><div class="text-xs text-surface-500">Sigla</div><div>{{ data().acronym }}</div></div>
          <div><div class="text-xs text-surface-500">Tipo</div><div>{{ data().insurerTypeLabel }}</div></div>
          <div class="col-span-2"><div class="text-xs text-surface-500">Nombre</div><div>{{ data().name }}</div></div>
          <div><div class="text-xs text-surface-500">CUIT</div><div>{{ data().cuit }}</div></div>
          @if (data().authorizationUrl) {
            <div class="col-span-3"><div class="text-xs text-surface-500">URL de autorización</div><div>{{ data().authorizationUrl }}</div></div>
          }
          @if (data().description) {
            <div class="col-span-3"><div class="text-xs text-surface-500">Descripción</div><div>{{ data().description }}</div></div>
          }
        </div>
      </section>

      @if (data().contacts.length) {
        <section>
          <h3 class="text-base font-semibold mb-2">Contactos</h3>
          <ul class="space-y-1">
            @for (c of data().contacts; track c.label) {
              <li class="text-sm">{{ c.label }}: {{ c.value }}</li>
            }
          </ul>
        </section>
      }

      <section>
        <h3 class="text-base font-semibold mb-2">Planes y convenios</h3>
        <p-table [value]="data().plans" dataKey="code">
          <ng-template pTemplate="header">
            <tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>IVA</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ p.acronym }}</td>
              <td>{{ p.validFromDate }}</td><td>{{ p.nbuLabel }}</td>
              <td>{{ p.ubValue | currencyAr }}</td><td>{{ p.coveragePercentage }}%</td><td>{{ p.iva }}%</td>
            </tr>
          </ng-template>
        </p-table>
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<ResumenView>();
}
```

- [ ] **Step 4: Verificar que tipa (vitest sobre el spec del form que viene en Task 12 aún no existe; verificación de tipos vía build se hace en Task 14). Commit.**

```bash
git add src/app/features/obras-sociales/pages/obra-social-form/steps
git commit -m "feat(obras-sociales): componentes de paso del stepper (aseguradora/planes/resumen)"
```

---

## Task 12: Pantalla 2 — Form page (orquestación del stepper)

**Files:**
- Create: `src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.ts`
- Create: `src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.spec.ts`

- [ ] **Step 1: Crear la form page**

```typescript
import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InsurerTypeCode, SpecificData, humanizeInsurerType } from '../../models/insurer.model';
import { WizardCreate, WizardContact, PlanWithAgreement } from '../../models/wizard.model';
import { createObraSocial, createObraSocialSuccess, loadObraSocialCatalogs } from '../../store/obra-social.actions';
import { selectObraSocialCreating, selectNbuOptions } from '../../store/obra-social.selectors';
import { OBRA_SOCIAL_FORM_STEPS } from './obra-social-form-steps';
import { ObraSocialStepperHeaderComponent } from './components/stepper-header/obra-social-stepper-header.component';
import { AseguradoraStepComponent } from './steps/aseguradora-step.component';
import { PlanesStepComponent } from './steps/planes-step.component';
import { ResumenStepComponent, ResumenView } from './steps/resumen-step.component';

function isoFromDate(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

@Component({
  selector: 'os-obra-social-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    ObraSocialStepperHeaderComponent, AseguradoraStepComponent, PlanesStepComponent, ResumenStepComponent,
  ],
  template: `
    <form [formGroup]="form" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">Nueva obra social</h1>
        <nav class="ml-auto text-xs text-surface-500">Obras Sociales › Nueva</nav>
      </header>

      <os-stepper-header
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        @switch (currentStep()) {
          @case (0) { <os-aseguradora-step [group]="aseguradoraGroup" /> }
          @case (1) { <os-planes-step [array]="planesArray" [nbuOptions]="nbuOptions()" /> }
          @case (2) { <os-resumen-step [data]="resumenView()" /> }
        }
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-400">Paso {{ currentStep() + 1 }} de {{ steps.length }}</span>
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (isLastStep()) {
            <p-button label="Guardar" type="button" severity="success" [loading]="creating()" [disabled]="!canSubmit()" (onClick)="confirmSave()" />
          } @else {
            <p-button label="Continuar →" type="button" [disabled]="!canContinue()" (onClick)="goNext()" />
          }
          @if (!isFirstStep()) {
            <p-button label="← Atrás" [text]="true" type="button" (onClick)="goBack()" />
          }
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class ObraSocialFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = OBRA_SOCIAL_FORM_STEPS;
  readonly creating = this.store.selectSignal(selectObraSocialCreating);
  readonly nbuOptions = this.store.selectSignal(selectNbuOptions);

  readonly form: FormGroup = this.fb.group({
    aseguradora: this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      acronym: ['', [Validators.required, Validators.maxLength(10)]],
      insurerType: ['SOCIAL' as InsurerTypeCode, Validators.required],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{2}-?\d{8}-?\d$/)]],
      authorizationUrl: ['', [Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(255)]],
      phone: [''],
      email: ['', [Validators.email]],
    }),
    planes: this.fb.array<FormGroup>([]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly aseguradoraValid = computed(() => {
    void this.value(); void this.status();
    return this.aseguradoraGroup.valid;
  });
  readonly hasPlans = computed(() => {
    void this.value();
    return this.planesArray.length >= 1;
  });

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.aseguradoraValid();
    if (this.currentStep() === 1) return this.hasPlans();
    return true;
  });
  readonly canSubmit = computed(() => this.aseguradoraValid() && this.hasPlans() && !this.creating());

  get aseguradoraGroup(): FormGroup { return this.form.get('aseguradora') as FormGroup; }
  get planesArray(): FormArray<FormGroup> { return this.form.get('planes') as FormArray<FormGroup>; }

  readonly resumenView = computed<ResumenView>(() => {
    void this.value();
    const a = this.aseguradoraGroup.getRawValue() as {
      code: string; name: string; acronym: string; insurerType: InsurerTypeCode;
      cuit: string; authorizationUrl: string; description: string; phone: string; email: string;
    };
    const contacts: { label: string; value: string }[] = [];
    if (a.phone?.trim()) contacts.push({ label: 'Teléfono', value: a.phone.trim() });
    if (a.email?.trim()) contacts.push({ label: 'Email', value: a.email.trim() });
    const plans = this.planesArray.controls.map((c) => {
      const v = c.getRawValue() as {
        code: string; name: string; acronym: string; validFromDate: string;
        versionNbu: number; ubValue: number; coveragePercentage: number; iva: number;
      };
      return {
        code: v.code, name: v.name, acronym: v.acronym, validFromDate: v.validFromDate,
        nbuLabel: this.nbuOptions().find((o) => o.value === Number(v.versionNbu))?.label ?? String(v.versionNbu),
        ubValue: Number(v.ubValue), coveragePercentage: Number(v.coveragePercentage), iva: Number(v.iva),
      };
    });
    return {
      code: a.code, name: a.name, acronym: a.acronym,
      insurerTypeLabel: humanizeInsurerType(a.insurerType), cuit: a.cuit,
      authorizationUrl: a.authorizationUrl, description: a.description,
      contacts, plans,
    };
  });

  ngOnInit(): void {
    this.store.dispatch(loadObraSocialCatalogs());
    this.actions$
      .pipe(ofType(createObraSocialSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/obras-sociales']));
  }

  goNext(): void {
    if (!this.canContinue()) {
      if (this.currentStep() === 0) this.aseguradoraGroup.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private buildPayload(): WizardCreate {
    const a = this.aseguradoraGroup.getRawValue() as {
      code: string; name: string; acronym: string; insurerType: InsurerTypeCode;
      cuit: string; authorizationUrl: string; description: string; phone: string; email: string;
    };
    let specificData: SpecificData | null = null;
    if (a.insurerType === 'SOCIAL') specificData = { socialHealth: { cuit: a.cuit } };
    else if (a.insurerType === 'PRIVATE') specificData = { privateHealth: { cuit: a.cuit, copayPolicy: '' } };

    const contacts: WizardContact[] = [];
    if (a.phone?.trim()) contacts.push({ contactType: 'PHONE', contact: a.phone.trim() });
    if (a.email?.trim()) contacts.push({ contactType: 'EMAIL', contact: a.email.trim() });

    const plans: PlanWithAgreement[] = this.planesArray.controls.map((c) => {
      const v = c.getRawValue() as {
        code: string; name: string; acronym: string; validFromDate: unknown;
        versionNbu: number; ubValue: number; coveragePercentage: number; iva: number;
      };
      return {
        plan: { code: v.code, acronym: v.acronym, name: v.name, iva: Number(v.iva) },
        agreement: {
          versionNbu: Number(v.versionNbu), requiresCopayment: false,
          coveragePercentage: Number(v.coveragePercentage), ubValue: Number(v.ubValue),
          validFromDate: isoFromDate(v.validFromDate),
        },
      };
    });

    return {
      insurer: {
        code: a.code, name: a.name, acronym: a.acronym, insurerType: a.insurerType,
        description: a.description || undefined, authorizationUrl: a.authorizationUrl || undefined,
        specificData,
      },
      plans, contacts,
    };
  }

  confirmSave(): void {
    if (!this.canSubmit()) return;
    this.confirm.confirm({
      header: 'Confirmar guardado',
      message: '¿Guardar la obra social y sus planes?',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(createObraSocial({ payload: this.buildPayload() })),
    });
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/obras-sociales']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los datos cargados.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/obras-sociales']),
    });
  }
}
```

- [ ] **Step 2: Crear el smoke test**

Create `src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ObraSocialFormPage } from './obra-social-form.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { loadObraSocialCatalogs } from '../../store/obra-social.actions';

describe('ObraSocialFormPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ObraSocialFormPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('despacha loadObraSocialCatalogs en init y arranca en paso 0', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadObraSocialCatalogs());
    expect(fixture.componentInstance.currentStep()).toBe(0);
  });

  it('no permite continuar del paso 0 con el form vacío', () => {
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    expect(fixture.componentInstance.canContinue()).toBe(false);
  });

  it('con aseguradora válida, canContinue(paso 0)=true y goNext avanza al paso 1', () => {
    const fixture = TestBed.createComponent(ObraSocialFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.aseguradoraGroup.setValue({
      code: 'NEW', name: 'Nueva OS', acronym: 'NOS', insurerType: 'SOCIAL',
      cuit: '30-12345678-9', authorizationUrl: '', description: '', phone: '', email: '',
    });
    expect(cmp.canContinue()).toBe(true);
    cmp.goNext();
    expect(cmp.currentStep()).toBe(1);
  });
});
```

> El alta completa (agregar plan en el paso 2 → confirmar → `createObraSocial`) se valida manualmente en Task 14, porque empujar al `FormArray` lo hace `PlanesStepComponent` en runtime y no aporta como unit test del page.

- [ ] **Step 3: Correr el smoke test**

Run: `npx vitest run src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.spec.ts`
Expected: PASS (con la versión robusta del tercer test).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.ts src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.spec.ts
git commit -m "feat(obras-sociales): pantalla de alta (stepper 3 pasos) + smoke test"
```

---

## Task 13: Pantalla 3 — Detalle (4 tabs, solo lectura)

**Files:**
- Create: `src/app/features/obras-sociales/pages/obra-social-detail/obra-social-detail.page.ts`
- Create: `src/app/features/obras-sociales/pages/obra-social-detail/obra-social-detail.page.spec.ts`

- [ ] **Step 1: Crear la página de detalle** (calcada de `patient-detail.page.ts`, con `p-tabs`)

```typescript
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CONTACT_TYPE_LABELS } from '../../models/contact-info.model';
import { PlanComplete } from '../../models/plan.model';
import { loadObraSocial, loadObraSocialFailure, clearSelectedObraSocial } from '../../store/obra-social.actions';
import { selectSelectedObraSocial, selectObraSocialPending, selectNbuOptions } from '../../store/obra-social.selectors';

@Component({
  selector: 'os-obra-social-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule, DatePipe, ButtonModule, TabsModule, TableModule, TagModule, SelectModule,
    CurrencyArPipe, EmptyStateComponent,
  ],
  template: `
    @if (insurer(); as o) {
      <div class="p-6">
        <a routerLink="/obras-sociales" class="inline-block mb-3">
          <p-button [text]="true" icon="pi pi-arrow-left" label="Volver a Obras Sociales" />
        </a>
        <header class="flex items-center justify-between mb-3">
          <h1 class="text-2xl font-semibold">
            {{ o.name }}
            @if (o.active) { <p-tag value="Activa" severity="success" class="ml-2" /> }
            @else { <p-tag value="Inactiva" severity="danger" class="ml-2" /> }
          </h1>
        </header>

        <p-tabs value="info">
          <p-tablist>
            <p-tab value="info">Información</p-tab>
            @if (o.insurerType !== 'SELF_PAY') { <p-tab value="contacts">Contactos</p-tab> }
            <p-tab value="plans">Planes y convenios</p-tab>
            <p-tab value="history">Convenios</p-tab>
          </p-tablist>
          <p-tabpanels>
            <!-- INFORMACIÓN -->
            <p-tabpanel value="info">
              <div class="grid grid-cols-3 gap-3">
                <div><div class="text-xs text-surface-500">Código</div><div>{{ o.code }}</div></div>
                <div><div class="text-xs text-surface-500">Sigla</div><div>{{ o.acronym }}</div></div>
                <div><div class="text-xs text-surface-500">Tipo</div><div>{{ o.insurerTypeName }}</div></div>
                @if (o.specificData?.socialHealth || o.specificData?.privateHealth) {
                  <div><div class="text-xs text-surface-500">CUIT</div><div>{{ cuit() }}</div></div>
                }
                @if (o.specificData?.privateHealth?.copayPolicy) {
                  <div class="col-span-2"><div class="text-xs text-surface-500">Política de copago</div><div>{{ o.specificData?.privateHealth?.copayPolicy }}</div></div>
                }
                @if (o.specificData?.selfPay?.acceptedPaymentMethods) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">Medios de pago aceptados</div><div>{{ o.specificData?.selfPay?.acceptedPaymentMethods }}</div></div>
                }
                @if (o.authorizationUrl) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">URL de autorización</div><div>{{ o.authorizationUrl }}</div></div>
                }
                @if (o.description) {
                  <div class="col-span-3"><div class="text-xs text-surface-500">Descripción</div><div>{{ o.description }}</div></div>
                }
              </div>
            </p-tabpanel>

            <!-- CONTACTOS -->
            @if (o.insurerType !== 'SELF_PAY') {
              <p-tabpanel value="contacts">
                @if (o.contacts.length === 0) {
                  <ui-empty-state heading="Sin contactos" icon="pi-phone" />
                } @else {
                  <ul class="space-y-1">
                    @for (c of o.contacts; track c.id) {
                      <li class="flex gap-2 items-center">
                        <p-tag [value]="contactLabel(c.contactType)" />
                        <span>{{ c.contact }}</span>
                        @if (!c.isActive) { <p-tag severity="danger" value="Inactivo" /> }
                      </li>
                    }
                  </ul>
                }
              </p-tabpanel>
            }

            <!-- PLANES Y CONVENIOS -->
            <p-tabpanel value="plans">
              @if (o.plans.length === 0) {
                <ui-empty-state heading="Sin planes" icon="pi-folder-open" />
              } @else {
                <p-table [value]="o.plans" dataKey="id">
                  <ng-template pTemplate="header">
                    <tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>IVA</th><th>Estado</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-p>
                    <tr>
                      <td>{{ p.code }}</td><td class="font-medium">{{ p.name }}</td><td>{{ p.acronym }}</td>
                      <td>{{ currentAgreement(p)?.validFromDate | date:'dd/MM/yyyy' }}</td>
                      <td>{{ nbuLabel(currentAgreement(p)?.versionNbu) }}</td>
                      <td>{{ currentAgreement(p)?.ubValue | currencyAr }}</td>
                      <td>{{ currentAgreement(p)?.coveragePercentage }}%</td>
                      <td>{{ p.iva }}%</td>
                      <td>
                        @if (p.isActive) { <p-tag severity="success" value="Activo" /> }
                        @else { <p-tag severity="danger" value="Inactivo" /> }
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </p-tabpanel>

            <!-- CONVENIOS (historial por plan) -->
            <p-tabpanel value="history">
              @if (o.plans.length === 0) {
                <ui-empty-state heading="Sin convenios" icon="pi-history" />
              } @else {
                <div class="mb-3 max-w-xs">
                  <p-select
                    [options]="planOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [(ngModel)]="selectedPlanId"
                    placeholder="Elegí un plan" />
                </div>
                <p-table [value]="selectedAgreements()" dataKey="id">
                  <ng-template pTemplate="header">
                    <tr><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>Vigente desde</th><th>Vigente hasta</th></tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-a>
                    <tr>
                      <td>{{ nbuLabel(a.versionNbu) }}</td>
                      <td>{{ a.ubValue | currencyAr }}</td>
                      <td>{{ a.coveragePercentage }}%</td>
                      <td>{{ a.validFromDate | date:'dd/MM/yyyy' }}</td>
                      <td>{{ a.validToDate ? (a.validToDate | date:'dd/MM/yyyy') : '—' }}</td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="emptymessage">
                    <tr><td colspan="5" class="text-surface-500 text-sm py-3">Elegí un plan para ver sus convenios.</td></tr>
                  </ng-template>
                </p-table>
              }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    } @else {
      <div class="p-6">{{ pending() ? 'Cargando…' : 'Obra social no encontrada.' }}</div>
    }
  `,
})
export class ObraSocialDetailPage implements OnInit, OnDestroy {
  /** Param de ruta vía withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);

  readonly insurer = this.store.selectSignal(selectSelectedObraSocial);
  readonly pending = this.store.selectSignal(selectObraSocialPending);
  private readonly nbuOptions = this.store.selectSignal(selectNbuOptions);

  selectedPlanId: number | null = null;

  constructor() {
    this.actions$
      .pipe(ofType(loadObraSocialFailure), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/obras-sociales']));
  }

  readonly cuit = computed(() => {
    const sd = this.insurer()?.specificData;
    return sd?.socialHealth?.cuit ?? sd?.privateHealth?.cuit ?? '—';
  });

  readonly planOptions = computed(() =>
    (this.insurer()?.plans ?? []).map((p) => ({ label: `${p.name} (${p.code})`, value: p.id })),
  );

  readonly selectedAgreements = computed(() => {
    const o = this.insurer();
    if (!o) return [];
    const planId = this.selectedPlanId ?? o.plans[0]?.id ?? null;
    const plan = o.plans.find((p) => p.id === planId);
    return plan?.actualAgreements ?? [];
  });

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) { this.router.navigate(['/obras-sociales']); return; }
    this.store.dispatch(loadObraSocial({ id: numericId }));
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedObraSocial()); }

  contactLabel(code: keyof typeof CONTACT_TYPE_LABELS): string { return CONTACT_TYPE_LABELS[code] ?? code; }
  nbuLabel(value: number | undefined): string {
    if (value == null) return '—';
    return this.nbuOptions().find((o) => o.value === value)?.label ?? String(value);
  }
  currentAgreement(p: PlanComplete) {
    return p.actualAgreements.find((a) => !a.validToDate) ?? p.actualAgreements[0];
  }
}
```

> NOTA: el tab "Convenios" usa `[(ngModel)]="selectedPlanId"` (por eso `FormsModule`). El `computed selectedAgreements` lee `selectedPlanId`; al ser un campo plano, el cambio del select dispara CD (OnPush + evento del `p-select`). Si no refresca en runtime, convertir `selectedPlanId` a `signal<number|null>(null)` y usar `[ngModel]`/`(onChange)` (verificar en Task 14).

- [ ] **Step 2: Crear el smoke test**

Create `src/app/features/obras-sociales/pages/obra-social-detail/obra-social-detail.page.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentRef } from '@angular/core';
import { ObraSocialDetailPage } from './obra-social-detail.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { loadObraSocial } from '../../store/obra-social.actions';
import { InsurerComplete } from '../../models/insurer.model';

const insurer: InsurerComplete = {
  id: 7, code: 'OSDE', name: 'OSDE', acronym: 'OSDE', insurerType: 'PRIVATE',
  insurerTypeName: 'Prepaga', active: true,
  specificData: { privateHealth: { cuit: '30-1-9', copayPolicy: 'x' } },
  plans: [], contacts: [],
};

describe('ObraSocialDetailPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ObraSocialDetailPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: { ...initialObraSocialState, selected: insurer } } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('despacha loadObraSocial con el id numérico en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(ObraSocialDetailPage);
    (fixture.componentRef as ComponentRef<ObraSocialDetailPage>).setInput('id', '7');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadObraSocial({ id: 7 }));
  });

  it('renderiza el nombre de la obra social seleccionada', () => {
    const fixture = TestBed.createComponent(ObraSocialDetailPage);
    (fixture.componentRef as ComponentRef<ObraSocialDetailPage>).setInput('id', '7');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('OSDE');
  });
});
```

- [ ] **Step 3: Correr el smoke test**

Run: `npx vitest run src/app/features/obras-sociales/pages/obra-social-detail/obra-social-detail.page.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/obras-sociales/pages/obra-social-detail
git commit -m "feat(obras-sociales): pantalla de detalle (4 tabs solo lectura) + smoke test"
```

---

## Task 14: Verificación final

**Files:** ninguno (verificación).

- [ ] **Step 1: Correr toda la suite de tests del feature**

Run: `npx vitest run src/app/features/obras-sociales`
Expected: PASS (todos los specs de obras-sociales en verde).

- [ ] **Step 2: Correr la suite completa (no romper nada existente)**

Run: `npm test`
Expected: PASS (sin regresiones).

- [ ] **Step 3: Build de producción (type-check + template strict)**

Run: `npm run build`
Expected: build OK, sin errores de TypeScript ni de `strictTemplates`.
Si falla por la nota del `[(ngModel)]` del detalle (Task 13), pasar `selectedPlanId` a `signal` + `[ngModel]`/`(onChange)` y rebuild.

- [ ] **Step 4: Verificación manual (servir la app)**

Run: `npm start` y navegar a `/obras-sociales`. Verificar:
1. **Listado**: se ven las obras sociales mock; búsqueda filtra; botones Activas/Inactivas/Todas filtran; el `p-select` de Tipo filtra; paginación funciona; "Ver detalle" navega.
2. **Alta**: botón "Nueva obra social" → stepper. Paso 1 valida; Paso 2 agrega/quita planes (mín. 1); Paso 3 muestra el resumen; "Guardar" confirma, crea, vuelve al listado y **la nueva OS aparece**.
3. **Detalle**: las 4 tabs muestran datos; "Contactos" se oculta para Particular (SELF_PAY); "Convenios" deja elegir plan y lista sus convenios.
4. **Menú**: "Obras Sociales" (sección Gestión) ya estaba y navega bien.

- [ ] **Step 5: Commit final (si hubo ajustes del Step 3/4)**

```bash
git add -A
git commit -m "fix(obras-sociales): ajustes post-verificación (build + manual)"
```

---

## Self-review (cobertura del spec)

- ✅ Listado tabla (columnas, búsqueda, filtros estado/tipo, paginación, ver detalle) → Task 9.
- ✅ Stepper de alta 3 pasos (aseguradora/planes/resumen), Reactive Forms, header custom, confirm, persistencia mock → Tasks 10-12.
- ✅ Detalle 4 tabs solo lectura, `p-tabs`, Contactos oculto para SELF_PAY → Task 13.
- ✅ NgRx clásico + servicio mock (swap por servicio) → Tasks 3-7.
- ✅ Modelos portados + page request/result → Task 1.
- ✅ Catálogos (tipos/NBU/contactos) → Tasks 2-3-7.
- ✅ Rutas + store a nivel ruta; nav y placeholder → Task 8.
- ✅ Tests: reducer/selectors/service/effects (TDD) + smoke de páginas → Tasks 3,5,6,7,9,12,13.
- ✅ Errores en español sin leak (regla #4) → effects (Task 7).
- ✅ Datos semilla con SELF_PAY e inactiva → Task 2.
- ⚠️ Diferido conscientemente: edición inline de planes en el stepper (solo add/remove) y filtro por rango de fechas en tab Convenios (selector de plan + tabla). Documentado arriba.
