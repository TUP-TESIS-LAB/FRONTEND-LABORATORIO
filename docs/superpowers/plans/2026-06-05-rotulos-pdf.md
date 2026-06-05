# Rótulos a PDF (interino) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-06-05-rotulos-pdf-design.md`
> **Jira:** _(pendiente — se crea con `jira-workflow` antes de ejecutar)_
> **Rama/worktree:** `feat/atencion-recepcion` en `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion`. Solo frontend.

**Goal:** Bajar un PDF de los rótulos de un protocolo (código de barras Code128 del `label.id` + nº de protocolo), desde la lista de atención y desde la vista post-terminar del wizard, sin tocar el backend.

**Architecture:** FE-only. `LabelsService` (HTTP GET labels por protocolo) + `RotuloPdfService` (puro, jsPDF + jsbarcode). La orquestación (cargar labels → generar PDF o avisar si no hay) vive en un effect NgRx `downloadProtocolLabels$` (dispatch:false) para no duplicar lógica entre los dos disparadores; los componentes solo despachan la acción.

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico, PrimeNG, Vitest, **jsPDF** + **jsbarcode** (nuevas). `NotificationService` para toasts en español.

## Comandos de test
Desde `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion`:
- Specs de store/servicio (sin render): `npx vitest run <ruta-spec>`
- Specs de componente: `npx ng test --include="<glob>" --watch=false`
- Build: `npm run build`

## Estructura de archivos
- `features/analitica/models/label.model.ts` (**nuevo**) — `LabelResponse`.
- `features/analitica/services/labels.service.ts` (**nuevo**) — `getByProtocol`.
- `features/analitica/services/rotulo-pdf.service.ts` (**nuevo**) — `generate`.
- `features/analitica/store/atencion/atencion.{actions,effects}.ts` — `downloadProtocolLabels` + effect.
- `features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.ts` — acción por fila.
- `features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` — botón post-secretaría.
- `package.json` (+ `angular.json` allowedCommonJsDependencies si hace falta).

---

## Task 1: Agregar dependencias (jspdf + jsbarcode)

**Files:** `package.json`, posiblemente `angular.json`.

- [ ] **Step 1: Instalar**
```bash
npm install jspdf jsbarcode
npm install -D @types/jsbarcode
```
(jsPDF trae sus propios tipos; jsbarcode necesita `@types/jsbarcode`.)

- [ ] **Step 2: Build para detectar warning de CommonJS**

Run: `npm run build`
Expected: compila. Si aparece un warning tipo `'jsbarcode' is a CommonJS or AMD dependency` (o jspdf), abrir `angular.json` y agregar al target `build` → `options`:
```json
"allowedCommonJsDependencies": ["jspdf", "jsbarcode"]
```
y volver a `npm run build` → sin ese warning. Si no aparece el warning, no tocar `angular.json`.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json angular.json
git commit -m "build(atencion): agregar jspdf + jsbarcode para PDF de rotulos"
```
(Si no se modificó `angular.json`, no lo incluyas en el `git add`.)

---

## Task 2: `LabelResponse` + `LabelsService`

**Files:**
- Create: `src/app/features/analitica/models/label.model.ts`
- Create: `src/app/features/analitica/services/labels.service.ts`
- Test: `src/app/features/analitica/services/labels.service.spec.ts`

- [ ] **Step 1: Modelo** `label.model.ts`:
```ts
export interface LabelResponse {
  id: number;
  protocolId: number;
  analysisId: number;
}
```
(Solo tipamos lo que consumimos; el `id` es lo escaneable para el barcode.)

- [ ] **Step 2: Test (falla primero)** `labels.service.spec.ts` (mirá `analysis.service.spec.ts`: mock de `HttpClient` con `vi.fn()`):
```ts
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { LabelsService } from './labels.service';
import { LabelResponse } from '../models/label.model';

describe('LabelsService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: LabelsService;
  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({ providers: [LabelsService, { provide: HttpClient, useValue: http }] });
    service = TestBed.inject(LabelsService);
  });
  it('getByProtocol pega a /api/v1/analitica/preanalitica/labels/protocol/{id}', async () => {
    const labels: LabelResponse[] = [{ id: 1, protocolId: 9, analysisId: 3 }];
    http.get.mockReturnValue(of(labels));
    const r = await firstValueFrom(service.getByProtocol(9));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/preanalitica/labels/protocol/9');
    expect(r).toEqual(labels);
  });
});
```

- [ ] **Step 3: Correr y ver fallar:** `npx vitest run src/app/features/analitica/services/labels.service.spec.ts` → FAIL.

- [ ] **Step 4: Implementar** `labels.service.ts`:
```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LabelResponse } from '../models/label.model';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/preanalitica/labels';

  getByProtocol(protocolId: number): Observable<LabelResponse[]> {
    return this.http.get<LabelResponse[]>(`${this.baseUrl}/protocol/${protocolId}`);
  }
}
```

- [ ] **Step 5: Correr y ver pasar.** → PASS.

- [ ] **Step 6: Commit**
```bash
git add src/app/features/analitica/models/label.model.ts src/app/features/analitica/services/labels.service.ts src/app/features/analitica/services/labels.service.spec.ts
git commit -m "feat(atencion): LabelsService (labels por protocolo)"
```

---

## Task 3: `RotuloPdfService` (jsPDF + jsbarcode)

**Files:**
- Create: `src/app/features/analitica/services/rotulo-pdf.service.ts`
- Test: `src/app/features/analitica/services/rotulo-pdf.service.spec.ts`

- [ ] **Step 1: Test (falla primero)** `rotulo-pdf.service.spec.ts` (mockea jsPDF/jsbarcode + el canvas de jsdom):
```ts
import { vi } from 'vitest';

const mockDoc = { addImage: vi.fn(), text: vi.fn(), addPage: vi.fn(), setFontSize: vi.fn(), save: vi.fn() };
vi.mock('jspdf', () => ({ jsPDF: vi.fn(() => mockDoc) }));
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

import { RotuloPdfService } from './rotulo-pdf.service';

describe('RotuloPdfService', () => {
  let service: RotuloPdfService;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA');
    service = new RotuloPdfService();
  });

  it('genera N etiquetas con el nº de protocolo y guarda el pdf', () => {
    service.generate('P-5', [{ id: 1 }, { id: 2 }]);
    expect(mockDoc.addImage).toHaveBeenCalledTimes(2);
    expect(mockDoc.text).toHaveBeenCalledWith('P-5', expect.any(Number), expect.any(Number), { align: 'center' });
    expect(mockDoc.save).toHaveBeenCalledWith('rotulos-P-5.pdf');
  });

  it('con [] no genera ni guarda', () => {
    service.generate('P-5', []);
    expect(mockDoc.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y ver fallar:** `npx vitest run src/app/features/analitica/services/rotulo-pdf.service.spec.ts` → FAIL.

- [ ] **Step 3: Implementar** `rotulo-pdf.service.ts`:
```ts
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

@Injectable({ providedIn: 'root' })
export class RotuloPdfService {
  /** Genera y descarga un PDF con una etiqueta por label (barcode Code128 del id + nº de protocolo). */
  generate(protocolNumber: string, labels: { id: number }[]): void {
    if (labels.length === 0) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const labelW = 60, labelH = 24, mX = 10, mY = 10, gX = 6, gY = 6, cols = 3;
    const pageH = 297;
    const rowsPerPage = Math.max(1, Math.floor((pageH - mY) / (labelH + gY)));
    const perPage = cols * rowsPerPage;
    labels.forEach((label, i) => {
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();
      const col = posInPage % cols;
      const row = Math.floor(posInPage / cols);
      const x = mX + col * (labelW + gX);
      const y = mY + row * (labelH + gY);
      doc.addImage(this.barcodeDataUrl(String(label.id)), 'PNG', x, y, labelW, labelH - 8);
      doc.setFontSize(10);
      doc.text(protocolNumber, x + labelW / 2, y + labelH - 2, { align: 'center' });
    });
    doc.save(`rotulos-${protocolNumber}.pdf`);
  }

  private barcodeDataUrl(value: string): string {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40 });
    return canvas.toDataURL('image/png');
  }
}
```

- [ ] **Step 4: Correr y ver pasar.** → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/features/analitica/services/rotulo-pdf.service.ts src/app/features/analitica/services/rotulo-pdf.service.spec.ts
git commit -m "feat(atencion): RotuloPdfService (jsPDF + jsbarcode)"
```

---

## Task 4: Store — `downloadProtocolLabels` (effect orquestador)

**Files:**
- Modify: `src/app/features/analitica/store/atencion/atencion.actions.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.effects.ts`
- Test: `src/app/features/analitica/store/atencion/atencion.effects.spec.ts`

La acción no toca el state: el effect (dispatch:false) carga las labels y genera el PDF o avisa.

- [ ] **Step 1: Acción** en `atencion.actions.ts`:
```ts
export const downloadProtocolLabels = createAction('[Atencion Rotulos] Download Protocol Labels', props<{ protocolId: number; protocolNumber: string }>());
```

- [ ] **Step 2: Tests (fallan primero)** en `atencion.effects.spec.ts` (agregá mocks `labels = { getByProtocol: vi.fn() }`, `rotuloPdf = { generate: vi.fn() }`, `notification = { error: vi.fn(), success: vi.fn() }`, provistos como `{ provide: LabelsService, useValue: labels }`, etc.; importá `LabelsService`/`RotuloPdfService`/`NotificationService`):
```ts
it('downloadProtocolLabels$ con labels → genera el PDF', () => {
  const ls = [{ id: 1, protocolId: 9, analysisId: 3 }];
  (labels.getByProtocol as ReturnType<typeof vi.fn>).mockReturnValue(of(ls));
  effects.downloadProtocolLabels$.subscribe();
  actions$.next(A.downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  expect(labels.getByProtocol).toHaveBeenCalledWith(9);
  expect(rotuloPdf.generate).toHaveBeenCalledWith('P-9', ls);
  expect(notification.error).not.toHaveBeenCalled();
});

it('downloadProtocolLabels$ sin labels → notifica, no genera', () => {
  (labels.getByProtocol as ReturnType<typeof vi.fn>).mockReturnValue(of([]));
  effects.downloadProtocolLabels$.subscribe();
  actions$.next(A.downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  expect(notification.error).toHaveBeenCalled();
  expect(rotuloPdf.generate).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Correr y ver fallar.** → FAIL.

- [ ] **Step 4: Implementar el effect** en `atencion.effects.ts` (inyectar `private readonly labels = inject(LabelsService);`, `private readonly rotuloPdf = inject(RotuloPdfService);`, `private readonly notification = inject(NotificationService);`; imports: `LabelsService` de `'../../services/labels.service'`, `RotuloPdfService` de `'../../services/rotulo-pdf.service'`, `NotificationService` de `'@core/services/notification.service'`, `tap` de rxjs, la acción):
```ts
downloadProtocolLabels$ = createEffect(() =>
  this.actions$.pipe(
    ofType(downloadProtocolLabels),
    switchMap(({ protocolId, protocolNumber }) =>
      this.labels.getByProtocol(protocolId).pipe(
        tap(ls => {
          if (ls.length === 0) {
            this.notification.error('Sin rótulos', 'Este protocolo todavía no tiene rótulos generados.');
          } else {
            this.rotuloPdf.generate(protocolNumber, ls);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.notification.error('No se pudieron generar los rótulos', 'Reintentá en un momento.');
          return of(error);
        }),
      )),
  ), { dispatch: false });
```
(El effect es `{ dispatch: false }` — solo side-effects: HTTP + PDF/toast.)

- [ ] **Step 5: Correr y ver pasar.** → PASS.

- [ ] **Step 6: Commit**
```bash
git add src/app/features/analitica/store/atencion/atencion.actions.ts src/app/features/analitica/store/atencion/atencion.effects.ts src/app/features/analitica/store/atencion/atencion.effects.spec.ts
git commit -m "feat(atencion): effect que descarga el PDF de rotulos del protocolo"
```

---

## Task 5: Dashboard — acción "Rótulos PDF" por fila

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.ts`
- Test: su `.spec.ts` (si existe; si no, crear uno mínimo siguiendo `saas-admin/pages/dashboard/dashboard.page.spec.ts`).

- [ ] **Step 1: Test (falla primero)** — método dispatcha la acción:
```ts
it('downloadLabels despacha downloadProtocolLabels', () => {
  const store = TestBed.inject(MockStore);
  const spy = vi.spyOn(store, 'dispatch');
  const fixture = TestBed.createComponent(AtencionDashboardComponent);
  fixture.componentInstance.downloadLabels({ id: 1, protocolId: 9 } as any);
  expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
});
```
(Importá `downloadProtocolLabels` de las actions. Reusá el `TestBed.configureTestingModule` del spec existente; si no existe, crealo con `provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } })` + `provideRouter([])` + `provideNoopAnimations()`.)

- [ ] **Step 2: Correr y ver fallar.** → FAIL.

- [ ] **Step 3: Implementar** — agregar el método y el botón.
En la clase:
```ts
downloadLabels(row: AttentionResponse): void {
  if (row.protocolId == null) return;
  this.store.dispatch(downloadProtocolLabels({ protocolId: row.protocolId, protocolNumber: `P-${row.protocolId}` }));
}
```
(Importar `downloadProtocolLabels` de `../../../store/atencion/atencion.actions`.)
En el template, en la celda de acciones (el `<td class="w-32">` que tiene el botón "Retomar"/"Ver"), agregar ANTES o DESPUÉS de ese botón, dentro de un wrapper flex:
```html
<td>
  <div class="flex items-center gap-1 justify-end">
    @if (row.protocolId != null) {
      <p-button label="Rótulos" icon="pi pi-tag" size="small" severity="secondary" [text]="true"
                (onClick)="downloadLabels(row)" />
    }
    <p-button
      [label]="isTerminal(row.attentionState) ? 'Ver' : 'Retomar'"
      size="small"
      [outlined]="isTerminal(row.attentionState)"
      (onClick)="open(row)" />
  </div>
</td>
```

- [ ] **Step 4: Correr y ver pasar.** → PASS. Luego `npm run build` → OK.

- [ ] **Step 5: Commit**
```bash
git add src/app/features/analitica/pages/atencion/atencion-dashboard/
git commit -m "feat(atencion): accion Rotulos PDF por fila en el listado"
```

---

## Task 6: Wizard — botón "Descargar rótulos" (vista post-secretaría)

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`
- Test: `atencion-wizard.component.spec.ts`

- [ ] **Step 1: Test (falla primero)** en el spec del wizard (reusa `setup(state)` que ya existe; `makeDetail` tiene `id:1`, pero `protocolId:null` — el método guarda contra null, así que el test setea el protocolId en el detail o testea con un detail que lo tenga). Mínimo, testear el método directo:
```ts
it('downloadLabels despacha downloadProtocolLabels cuando hay protocolId', () => {
  setup(AttentionState.AWAITING_EXTRACTION);
  const store = TestBed.inject(MockStore);
  // forzar un detail con protocolId vía el override del selector si el spec lo permite,
  // o llamar al método con el detail mockeado; si makeDetail no tiene protocolId,
  // ajustar makeDetail para incluir protocolId: 9 en este test o setear el selector.
  store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.AWAITING_EXTRACTION), protocolId: 9 } as any);
  store.refreshState();
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.downloadLabels();
  expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
});
```
(Importá `downloadProtocolLabels` de las actions y `selectDetail` ya está importado en el spec. Si `overrideSelector` no está disponible con el setup actual, adaptá: hacé que `makeDetail` acepte/incluya `protocolId` y pasá uno.)

- [ ] **Step 2: Correr y ver fallar.** → FAIL.

- [ ] **Step 3: Implementar** — método + botón.
En la clase:
```ts
downloadLabels(): void {
  const d = this.detail();
  if (!d || d.protocolId == null) return;
  this.store.dispatch(downloadProtocolLabels({ protocolId: d.protocolId, protocolNumber: `P-${d.protocolId}` }));
}
```
(Importar `downloadProtocolLabels` de `../../../store/atencion/atencion.actions`.)
En el template, en el bloque `@else if (isPostSecretary())`, agregar el botón debajo del empty-state:
```html
@else if (isPostSecretary()) {
  <ui-empty-state heading="Fase de secretaría completada" icon="pi-clock"
                  [description]="postSecretaryDescription()" />
  @if (detail()!.protocolId != null) {
    <div class="flex justify-center mt-4">
      <p-button label="Descargar rótulos" icon="pi pi-tag" severity="secondary"
                (onClick)="downloadLabels()" />
    </div>
  }
}
```

- [ ] **Step 4: Correr y ver pasar.** → PASS. Luego `npm run build` → OK.

- [ ] **Step 5: Commit**
```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/
git commit -m "feat(atencion): boton Descargar rotulos en la vista post-secretaria"
```

---

## Task 7: Verificación integral

**Files:** ninguno.

- [ ] **Step 1: Specs tocados**
```bash
npx vitest run src/app/features/analitica/services/labels.service.spec.ts src/app/features/analitica/services/rotulo-pdf.service.spec.ts src/app/features/analitica/store/atencion/atencion.effects.spec.ts
npx ng test --include="src/app/features/analitica/pages/atencion/**/*.spec.ts" --watch=false
```
Expected: verde.

- [ ] **Step 2: Build:** `npm run build` → OK.

- [ ] **Step 3: Smoke manual** (app levantada, con un protocolo que tenga labels — recordar que `label_configurations` debe tener config para que el BE cree labels): en el listado, una atención post-secretaría muestra "Rótulos" → baja un PDF con barcodes + nº de protocolo; al terminar una atención, la vista "Fase de secretaría completada" muestra "Descargar rótulos". Un protocolo sin labels → toast "Este protocolo todavía no tiene rótulos generados", sin PDF.

---

## Self-Review (cobertura del spec)

- **§2/§4 PDF (barcode label.id + nº protocolo):** Task 3 (RotuloPdfService). ✔
- **§4 LabelsService + NgRx:** Task 2 (service) + Task 4 (action/effect). ✔
- **§5 disparadores:** Task 5 (lista, gated por protocolId) + Task 6 (wizard post-secretaría, gated por protocolId). ✔
- **§7 errores (sin labels / HTTP) en español:** Task 4 (effect: `notification.error` en ambos casos). ✔
- **§8 testing:** Tasks 2,3,4,5,6 con specs + Task 7. ✔
- **deps jspdf/jsbarcode:** Task 1. ✔
- **Type consistency:** `downloadProtocolLabels({protocolId, protocolNumber})` usado igual en action/effect/dashboard/wizard; `LabelResponse {id, protocolId, analysisId}`; `RotuloPdfService.generate(protocolNumber, labels)` con `labels: {id}[]`. ✔
- **Placeholders:** sin TODO/TBD; las notas "si el build warnea CommonJS" / "si overrideSelector no está" son contingencias verificables, no placeholders.
