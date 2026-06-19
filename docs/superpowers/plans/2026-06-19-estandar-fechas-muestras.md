# Estándar de fechas dd/mm/yyyy en Muestras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _a crear con `jira-workflow` al cerrar este plan (regla #1/#3 del CLAUDE.md)._
> **Spec:** `docs/superpowers/specs/2026-06-19-estandar-fechas-muestras-design.md`
> **Rama/worktree:** `feat/estandar-fechas-muestras` en `FRONTEND-LABORATORIO/.worktrees/estandar-fechas-muestras` (desde `development` d372c92)

**Goal:** Unificar el formato de fechas de la pantalla de Muestras y subpantallas a `dd/mm/yyyy` (con hora `HH:mm` donde corresponde), con una única fuente de formato: el pipe `DateEsPipe`.

**Architecture:** Se extiende `DateEsPipe` con 3 modos (`date`/`datetime`/`time`). El view-model `Sample` deja de cargar strings pre-formateados (`date`/`time`) y pasa a una fecha cruda ISO (`receivedAt`); el formato se aplica en los templates con el pipe. La pantalla de validación de protocolos (otro modelo, `date` ya ISO) solo cambia el template del `DatePipe` nativo al pipe.

**Tech Stack:** Angular 21 standalone + signals + OnPush, PrimeNG/Tailwind. Tests unit con Vitest; specs de componente con `ng test`.

## Global Constraints

- Import del pipe: `import { DateEsPipe } from '@shared/pipes/date-es.pipe';` (alias `@shared/*` configurado en tsconfig).
- Locale `es-AR`, hora 24h (`hour12: false`).
- Componentes standalone con `imports: [...]`; cambio sin romper `OnPush`.
- No emojis Unicode en UI (PrimeIcons). Mensajes al usuario en español.
- Worktree nuevo: correr `npm ci` antes de testear/buildear.
- Runners: unit puro (pipe, tube.model) → `npx vitest run <archivo>`; specs de componente → `ng test`.

---

### Task 1: Extender `DateEsPipe` con modos date/datetime/time

**Files:**
- Modify: `src/app/shared/pipes/date-es.pipe.ts`
- Test (Create): `src/app/shared/pipes/date-es.pipe.spec.ts`

**Interfaces:**
- Produces: `DateEsPipe.transform(value: string | Date | null | undefined, mode?: 'date' | 'datetime' | 'time'): string`. Default `mode='date'`. `'date'` → `dd/mm/yyyy`; `'datetime'` → `dd/mm/yyyy HH:mm`; `'time'` → `HH:mm`. Null/undefined/fecha inválida → `''`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/shared/pipes/date-es.pipe.spec.ts`:

```ts
import { DateEsPipe } from './date-es.pipe';

describe('DateEsPipe', () => {
  const pipe = new DateEsPipe();
  const iso = '2026-06-19T14:30:00'; // hora local, no UTC

  it('formatea solo fecha por default (dd/mm/yyyy)', () => {
    expect(pipe.transform(iso)).toBe('19/06/2026');
  });

  it("modo 'time' devuelve HH:mm 24h", () => {
    expect(pipe.transform(iso, 'time')).toBe('14:30');
  });

  it("modo 'datetime' devuelve dd/mm/yyyy HH:mm", () => {
    expect(pipe.transform(iso, 'datetime')).toBe('19/06/2026 14:30');
  });

  it('acepta un objeto Date', () => {
    expect(pipe.transform(new Date(2026, 5, 7, 9, 5))).toBe('07/06/2026');
  });

  it('devuelve "" para null/undefined/valor inválido', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('no-es-fecha')).toBe('');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/shared/pipes/date-es.pipe.spec.ts`
Expected: FAIL — el pipe actual ignora `mode` y no maneja valor inválido (los casos `time`/`datetime`/inválido fallan).

- [ ] **Step 3: Implementar el pipe**

Reemplazar el contenido de `src/app/shared/pipes/date-es.pipe.ts`:

```ts
import { Pipe, PipeTransform } from '@angular/core';

export type DateEsMode = 'date' | 'datetime' | 'time';

@Pipe({ name: 'dateEs', standalone: true })
export class DateEsPipe implements PipeTransform {
  private readonly dateFmt = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  private readonly timeFmt = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  transform(value: string | Date | null | undefined, mode: DateEsMode = 'date'): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    if (mode === 'time') return this.timeFmt.format(d);
    if (mode === 'datetime') return `${this.dateFmt.format(d)} ${this.timeFmt.format(d)}`;
    return this.dateFmt.format(d);
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/app/shared/pipes/date-es.pipe.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/pipes/date-es.pipe.ts src/app/shared/pipes/date-es.pipe.spec.ts
git commit -m "feat(shared): DateEsPipe con modos date/datetime/time"
```

---

### Task 2: `Sample` con fecha cruda `receivedAt` + consumidores vía pipe

Cambio atómico: renombrar el campo en el view-model obliga a actualizar el builder y todos los consumidores en el mismo paso para que compile.

**Files:**
- Modify: `src/app/features/analitica/muestras/models/sample.model.ts:6-19` (interface `Sample`)
- Modify: `src/app/features/analitica/muestras/models/tube.model.ts:36-44` (función `groupTubes`)
- Modify: `src/app/features/analitica/muestras/data/seed.ts:23-37` (factory `sample`)
- Modify: `src/app/features/analitica/muestras/components/sample-table/sample-table.component.ts` (decorator: agregar `imports`) y `.../sample-table.component.html:67`
- Modify: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.ts` (decorator + template inline)
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.ts:34` (imports) y `.../procesamiento.page.html:54`
- Test (Create): `src/app/features/analitica/muestras/models/tube.model.spec.ts`

**Interfaces:**
- Consumes: nada de Task 1 en tiempo de tipo (el pipe se usa en templates).
- Produces: `Sample.receivedAt: string` (ISO) reemplaza a `Sample.date: string` y `Sample.time: string`. `groupTubes(...)` ya no devuelve `date`/`time`, devuelve `receivedAt`.

- [ ] **Step 1: Escribir el test que falla (groupTubes)**

Crear `src/app/features/analitica/muestras/models/tube.model.spec.ts`:

```ts
import { groupTubes } from './tube.model';
import type { LabelWorklistItem } from './label-worklist.model';

function item(over: Partial<LabelWorklistItem>): LabelWorklistItem {
  return {
    labelId: 1, sampleId: 10, protocolId: 100, barcode: 'MX-1',
    analysisName: 'Hemograma', patientName: 'Pérez, J.', urgent: false,
    status: 'COLLECTED', rejectionReason: null,
    updatedAt: '2026-06-07T09:05:00',
    ...over,
  } as unknown as LabelWorklistItem;
}

describe('groupTubes', () => {
  it('expone receivedAt crudo (ISO) y ya no date/time pre-formateados', () => {
    const tubes = groupTubes([item({})], 'CENTRAL — Sede Central');
    expect(tubes[0].receivedAt).toBe('2026-06-07T09:05:00');
    expect((tubes[0] as Record<string, unknown>)['date']).toBeUndefined();
    expect((tubes[0] as Record<string, unknown>)['time']).toBeUndefined();
  });

  it('usa el updatedAt más reciente del grupo', () => {
    const tubes = groupTubes(
      [item({ labelId: 1, updatedAt: '2026-06-07T09:05:00' }),
       item({ labelId: 2, updatedAt: '2026-06-07T11:40:00' })],
      'CENTRAL',
    );
    expect(tubes[0].receivedAt).toBe('2026-06-07T11:40:00');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/analitica/muestras/models/tube.model.spec.ts`
Expected: FAIL — `receivedAt` no existe; `date`/`time` todavía presentes.

- [ ] **Step 3: Cambiar la interface `Sample`**

En `src/app/features/analitica/muestras/models/sample.model.ts`, reemplazar las líneas:

```ts
  date: string;
  time: string;
```

por:

```ts
  /** Timestamp ISO de recepción/última actualización. Se formatea en el template con `dateEs`. */
  receivedAt: string;
```

- [ ] **Step 4: Cambiar `groupTubes` (tube.model.ts)**

En `src/app/features/analitica/muestras/models/tube.model.ts`, dentro del objeto que devuelve `.map(...)`, reemplazar:

```ts
      date: `${two(d.getDate())}/${two(d.getMonth() + 1)}`,
      time: `${two(d.getHours())}:${two(d.getMinutes())}`,
```

por:

```ts
      receivedAt: latest.updatedAt,
```

Eliminar la constante `const two = (n: number): string => String(n).padStart(2, '0');` y la línea `const d = new Date(latest.updatedAt);` si quedan sin uso (verificar que `d` no se use en otro lado de la función; si no se usa, borrarla).

- [ ] **Step 5: Cambiar el seed (data/seed.ts)**

En `src/app/features/analitica/muestras/data/seed.ts`, dentro del factory `sample(...)`, reemplazar:

```ts
    date: '07/06',
    time: `${String(7 + (i % 4)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
```

por:

```ts
    receivedAt: `2026-06-07T${String(7 + (i % 4)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
```

- [ ] **Step 6: Actualizar sample-table (html + imports)**

En `src/app/features/analitica/muestras/components/sample-table/sample-table.component.html:67`, reemplazar:

```html
          <td>{{ row.date }} · {{ row.time }}</td>
```

por:

```html
          <td>{{ row.receivedAt | dateEs }} · {{ row.receivedAt | dateEs: 'time' }}</td>
```

En `src/app/features/analitica/muestras/components/sample-table/sample-table.component.ts`: agregar el import al tope `import { DateEsPipe } from '@shared/pipes/date-es.pipe';` y agregar `imports: [DateEsPipe],` dentro del `@Component({ ... })` (el decorator hoy no tiene `imports`; agregarlo, p. ej. justo después de `standalone: true,`).

- [ ] **Step 7: Actualizar sample-row (template inline + imports)**

En `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.ts`, en el `template` inline reemplazar:

```html
  <div class="col-time">{{ sample.date }} · {{ sample.time }}</div>
```

por:

```html
  <div class="col-time">{{ sample.receivedAt | dateEs }} · {{ sample.receivedAt | dateEs: 'time' }}</div>
```

Agregar el import `import { DateEsPipe } from '@shared/pipes/date-es.pipe';` y `imports: [DateEsPipe],` en el `@Component({ ... })` (hoy no tiene `imports`).

- [ ] **Step 8: Actualizar procesamiento (html + imports)**

En `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.html:54`, reemplazar:

```html
          <div class="cell-toma"><span class="toma-d">{{ t.date }}</span><span class="toma-h">{{ t.time }} hs</span></div>
```

por:

```html
          <div class="cell-toma"><span class="toma-d">{{ t.receivedAt | dateEs }}</span><span class="toma-h">{{ t.receivedAt | dateEs: 'time' }} hs</span></div>
```

En `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.ts`: agregar el import `import { DateEsPipe } from '@shared/pipes/date-es.pipe';` y sumar `DateEsPipe` al array `imports: [...]` de la línea 34.

- [ ] **Step 9: Correr el test de groupTubes y verificar que pasa**

Run: `npx vitest run src/app/features/analitica/muestras/models/tube.model.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Compilar para verificar que no quedó ningún consumidor de date/time**

Run: `npm run build`
Expected: build OK. Si tsc reporta algún uso de `.date`/`.time` sobre un `Sample` no listado, migrarlo a `receivedAt | dateEs` y repetir.

- [ ] **Step 11: Correr specs de componente tocados**

Run: `ng test --watch=false --include='**/muestras/**'` (o el subset de sample-table/sample-row/procesamiento)
Expected: PASS (los specs existentes siguen verdes).

- [ ] **Step 12: Commit**

```bash
git add src/app/features/analitica/muestras
git commit -m "refactor(muestras): Sample con receivedAt crudo, formato dd/mm/yyyy vía dateEs"
```

---

### Task 3: validación de protocolos — DatePipe nativo → dateEs

`ValidationListRow.date` ya es un ISO string; acá solo cambia el formateo del template (no se toca el modelo).

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.html:61-62`
- Modify: `src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.ts:2,29`

- [ ] **Step 1: Cambiar el template**

En `validacion-protocolos.page.html`, reemplazar:

```html
              <span class="toma-d">{{ r.date | date: 'dd/MM/yyyy' }}</span>
              <span class="toma-h">{{ r.date | date: 'HH:mm' }} hs</span>
```

por:

```html
              <span class="toma-d">{{ r.date | dateEs }}</span>
              <span class="toma-h">{{ r.date | dateEs: 'time' }} hs</span>
```

- [ ] **Step 2: Cambiar los imports del componente**

En `validacion-protocolos.page.ts`:
- Línea 2: reemplazar `import { DatePipe } from '@angular/common';` por `import { DateEsPipe } from '@shared/pipes/date-es.pipe';`
- Línea 29: reemplazar `imports: [PageHeaderComponent, DatePipe],` por `imports: [PageHeaderComponent, DateEsPipe],`

(Si `DatePipe` se usa en otro lado del componente, mantener ambos imports; verificar con búsqueda de `DatePipe`/`| date` en el archivo — según el spec solo se usa en estas 2 líneas.)

- [ ] **Step 3: Compilar y correr specs**

Run: `npm run build && ng test --watch=false --include='**/validacion-protocolos/**'`
Expected: build OK, specs verdes. Verificar visualmente que la fecha de toma se ve `dd/mm/yyyy` y la hora `HH:mm hs`.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/muestras/pages/validacion-protocolos
git commit -m "refactor(muestras): validacion-protocolos usa dateEs en vez de DatePipe"
```

---

## Verificación final

- [ ] `npx vitest run src/app/shared/pipes/date-es.pipe.spec.ts src/app/features/analitica/muestras/models/tube.model.spec.ts` → verde.
- [ ] `npm run build` → OK.
- [ ] `ng test --watch=false` (suite de muestras) → verde.
- [ ] Revisión visual en las 4 pantallas: toda fecha en `dd/mm/yyyy` (con año), hora en `HH:mm`.

## Self-Review (cobertura del spec)

- Pipe extendido (3 modos) → Task 1. ✅
- `Sample` a fecha cruda + sin strings a mano → Task 2 (steps 3-5). ✅
- Sweep de los 4 puntos: sample-table (T2.6), sample-row (T2.7), procesamiento (T2.8), validacion-protocolos (T3). ✅
- Listado exhaustivo de consumidores de `Sample.date/time` → cubierto (sample-table, sample-row, procesamiento; seed como builder); `npm run build` (T2.10) atrapa cualquier straggler. ✅
- `ValidationListRow.date` NO se renombra (solo template) → Task 3. ✅
- Tests: pipe (T1) + groupTubes (T2) + specs de componente (T2.11/T3.3). ✅
- Fuera de alcance respetado: sin date-pickers, sin LOCALE_ID global, solo `features/analitica/muestras`. ✅
- Consistencia de tipos: `receivedAt: string` usado igual en interface, builder, seed y templates; `transform(value, mode)` firma única. ✅
