# Refactor pantalla "Resumen de la atención" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-06-05-resumen-atencion-refactor-design.md`
> **Jira:** _(pendiente — se crea con `jira-workflow` antes de ejecutar)_
> **Rama/worktree:** `feat/atencion-recepcion` en `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion` (este refactor depende del `resumen-step`/store de KAN-77; NO sale de `development`). Solo frontend.

**Goal:** Que el Resumen muestre el paciente (Apellido, Nombre · DNI) y los análisis por nombre, mueva "Cancelar atención" al header (izq de "Volver al listado") y reemplace el `window.prompt` de cancelación por un modal.

**Architecture:** Solo frontend. Los nombres se resuelven en el cliente vía store NgRx (paciente `GET /patients/{id}`, análisis `forkJoin(GET /analitica/analysis/{id})`). El botón Cancelar y su modal viven en el `AtencionWizardComponent`; un componente de modal nuevo (calcado del ticket-modal) maneja el motivo.

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico, PrimeNG (`p-dialog`), Vitest. Convención obligatoria `ngrx-backend-request` para las llamadas al back.

## Comandos de test
Desde `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion`:
- Specs de store/servicio (sin render): `npx vitest run <ruta-spec>`
- Specs de componente (render de signal inputs): `npx ng test --include="<glob>" --watch=false`
- Build: `npm run build`

## Estructura de archivos
- `store/atencion/atencion.{state,actions,reducer,effects,selectors}.ts` — cargar paciente + `summaryAnalyses`.
- `pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts` — render con datos reales.
- `pages/atencion/atencion-wizard/atencion-wizard.component.ts` — Cancelar al header + modal.
- `components/cancel-attention-modal/cancel-attention-modal.component.ts` (**nuevo**) + su spec.

---

## Task 1: Store — cargar el paciente del resumen

**Files:**
- Modify: `src/app/features/analitica/store/atencion/atencion.actions.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.effects.ts`
- Test: `src/app/features/analitica/store/atencion/atencion.effects.spec.ts`

Reutiliza el slice `resolvedPatient` (ya existe, con su reducer/selector). Solo agrega una acción de carga + su effect, que termina en `patientResolved`.

- [ ] **Step 1: Agregar la acción** en `atencion.actions.ts`:
```ts
export const loadAttentionPatient = createAction('[Atencion Resumen] Load Patient', props<{ patientId: number }>());
```

- [ ] **Step 2: Test del effect (falla primero)** en `atencion.effects.spec.ts` (mirá el setup existente: `patients` mock, `actions$`, `firstValueFrom`):
```ts
it('loadAttentionPatient$ → getById → patientResolved', async () => {
  const patient = { id: 5, dni: '1' } as Patient;
  (patients.getById as ReturnType<typeof vi.fn>).mockReturnValue(of(patient));
  actions$.next(A.loadAttentionPatient({ patientId: 5 }));
  const out = await firstValueFrom(effects.loadAttentionPatient$.pipe(take(1)));
  expect(patients.getById).toHaveBeenCalledWith(5);
  expect(out).toEqual(A.patientResolved({ patient }));
});
```
(Asegurate de que el mock `patients` incluya `getById: vi.fn()`.)

- [ ] **Step 3: Correr y ver fallar:** `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts` → FAIL (`effects.loadAttentionPatient$` no existe).

- [ ] **Step 4: Implementar el effect** en `atencion.effects.ts` (ya inyecta `patients = inject(PatientService)`; agregá la acción a los imports nombrados):
```ts
loadAttentionPatient$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadAttentionPatient),
    switchMap(({ patientId }) =>
      this.patients.getById(patientId).pipe(
        map(patient => patientResolved({ patient })),
        catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
      ))));
```

- [ ] **Step 5: Correr y ver pasar:** `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts` → PASS.

- [ ] **Step 6: Commit**
```bash
git add src/app/features/analitica/store/atencion/atencion.actions.ts src/app/features/analitica/store/atencion/atencion.effects.ts src/app/features/analitica/store/atencion/atencion.effects.spec.ts
git commit -m "feat(atencion): cargar paciente del resumen por id (store)"
```

---

## Task 2: Store — cargar análisis del resumen (con nombres)

**Files:**
- Modify: `src/app/features/analitica/store/atencion/atencion.state.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.actions.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.reducer.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.effects.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.selectors.ts`
- Test: `src/app/features/analitica/store/atencion/atencion.effects.spec.ts`

- [ ] **Step 1: State** en `atencion.state.ts` — agregar al `AtencionFeatureState` (tras `patientResolutionError`):
```ts
  summaryAnalyses: Analysis[];
  summaryAnalysesLoading: boolean;
```
Importar `Analysis` desde `'../../models/atencion.model'`. En `initialAtencionState`:
```ts
  summaryAnalyses: [],
  summaryAnalysesLoading: false,
```

- [ ] **Step 2: Actions** en `atencion.actions.ts`:
```ts
export const loadAttentionAnalyses     = createAction('[Atencion Resumen] Load Analyses', props<{ analysisIds: number[] }>());
export const attentionAnalysesLoaded   = createAction('[Atencion API] Analyses Loaded', props<{ analyses: Analysis[] }>());
export const attentionAnalysesFailure  = createAction('[Atencion API] Analyses Failure', props<{ error: HttpErrorResponse }>());
```
Importar `Analysis` desde `'../../models/atencion.model'` si no está.

- [ ] **Step 3: Reducer** en `atencion.reducer.ts` (handlers con tipo de retorno explícito; importar las acciones):
```ts
on(loadAttentionAnalyses, (s): AtencionFeatureState => ({ ...s, summaryAnalysesLoading: true })),
on(attentionAnalysesLoaded, (s, { analyses }): AtencionFeatureState => ({ ...s, summaryAnalyses: analyses, summaryAnalysesLoading: false })),
on(attentionAnalysesFailure, (s): AtencionFeatureState => ({ ...s, summaryAnalysesLoading: false })),
```

- [ ] **Step 4: Selector** en `atencion.selectors.ts`:
```ts
export const selectSummaryAnalyses = createSelector(selectAtencionState, s => s.summaryAnalyses);
```

- [ ] **Step 5: Tests del effect (fallan primero)** en `atencion.effects.spec.ts` (agregá `analysis` mock `{ getById: vi.fn() }` provisto como `{ provide: AnalysisService, useValue: analysis }`):
```ts
it('loadAttentionAnalyses$ → forkJoin getById → attentionAnalysesLoaded', async () => {
  const a1 = { id: 3, shortCode: 'BIO001', name: 'Hemograma' } as Analysis;
  const a2 = { id: 4, shortCode: 'BIO002', name: 'Glucemia' } as Analysis;
  (analysis.getById as ReturnType<typeof vi.fn>).mockImplementation((id: number) => of(id === 3 ? a1 : a2));
  actions$.next(A.loadAttentionAnalyses({ analysisIds: [3, 4] }));
  const out = await firstValueFrom(effects.loadAttentionAnalyses$.pipe(take(1)));
  expect(out).toEqual(A.attentionAnalysesLoaded({ analyses: [a1, a2] }));
});

it('loadAttentionAnalyses$ → ids vacío → loaded []', async () => {
  actions$.next(A.loadAttentionAnalyses({ analysisIds: [] }));
  const out = await firstValueFrom(effects.loadAttentionAnalyses$.pipe(take(1)));
  expect(out).toEqual(A.attentionAnalysesLoaded({ analyses: [] }));
});
```

- [ ] **Step 6: Correr y ver fallar:** `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts` → FAIL.

- [ ] **Step 7: Implementar el effect** en `atencion.effects.ts` (inyectar `private readonly analysis = inject(AnalysisService);`, importar `AnalysisService` de `'../../services/analysis.service'`, `forkJoin` de rxjs, y las acciones):
```ts
loadAttentionAnalyses$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadAttentionAnalyses),
    switchMap(({ analysisIds }) =>
      (analysisIds.length === 0
        ? of([] as Analysis[])
        : forkJoin(analysisIds.map(id => this.analysis.getById(id)))
      ).pipe(
        map(analyses => attentionAnalysesLoaded({ analyses })),
        catchError((error: HttpErrorResponse) => of(attentionAnalysesFailure({ error }))),
      ))));
```
(`AnalysisService.getById(id)` devuelve `Observable<AnalysisDetail>`, que extiende `Analysis` — el array es asignable a `Analysis[]`.)

- [ ] **Step 8: Correr y ver pasar:** `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts` → PASS.

- [ ] **Step 9: Commit**
```bash
git add src/app/features/analitica/store/atencion/
git commit -m "feat(atencion): cargar analisis del resumen con nombres (store)"
```

---

## Task 3: `resumen-step` — mostrar paciente + análisis reales

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts`
- Test: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.spec.ts` (crear si no existe)

- [ ] **Step 1: Test (falla primero)** — render con `provideMockStore`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { ResumenStepComponent } from './resumen-step.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../../../store/atencion/atencion.state';
import { loadAttentionAnalyses, loadAttentionPatient } from '../../../../../store/atencion/atencion.actions';

function attn(): any {
  return { id: 1, patientId: 5, isUrgent: false, indications: null,
           analysisAuthorizations: [{ id: 1, analysisId: 3, isAuthorized: true, active: true }] };
}

describe('ResumenStepComponent', () => {
  let store: MockStore;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [
        provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: {
          ...initialAtencionState,
          resolvedPatient: { id: 5, dni: '18901234', firstName: 'Tute', lastName: 'Gaymer' } as any,
          summaryAnalyses: [{ id: 3, shortCode: 'BIO001', name: 'Hemograma', familyName: null, ubCount: null }],
        } } }),
        provideMockActions(() => new ReplaySubject(1)),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('despacha loadAttentionPatient + loadAttentionAnalyses en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadAttentionAnalyses({ analysisIds: [3] }));
    // loadAttentionPatient sólo si falta o no coincide; acá resolvedPatient.id===5===patientId → NO se despacha
    expect(spy).not.toHaveBeenCalledWith(loadAttentionPatient({ patientId: 5 }));
  });

  it('muestra apellido, nombre, dni y el nombre del análisis', () => {
    const f = TestBed.createComponent(ResumenStepComponent);
    f.componentRef.setInput('atencion', attn());
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Gaymer, Tute');
    expect(text).toContain('18901234');
    expect(text).toContain('Hemograma');
  });
});
```

- [ ] **Step 2: Correr y ver fallar:** `npx ng test --include="src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/*.spec.ts" --watch=false` → FAIL.

- [ ] **Step 3: Reescribir `resumen-step.component.ts`** (mantiene "Finalizar atención" + ticket modal; agrega datos reales):
```ts
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { race, take } from 'rxjs';
import { AttentionResponse } from '../../../../../models/atencion.model';
import {
  endSecretaryPhase, loadAttentionPatient, loadAttentionAnalyses,
  atencionMutationSuccess, atencionMutationFailure,
} from '../../../../../store/atencion/atencion.actions';
import { selectMutating, selectResolvedPatient, selectSummaryAnalyses } from '../../../../../store/atencion/atencion.selectors';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';
import { AttentionTicketModalComponent } from '../../../../../components/attention-ticket-modal/attention-ticket-modal.component';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, AttentionTicketModalComponent],
  templateUrl: './resumen-step.component.html',
})
export class ResumenStepComponent implements OnInit {
  private readonly store      = inject(Store);
  private readonly actions$   = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  readonly atencion = input.required<AttentionResponse>();
  readonly finished = output<void>();

  readonly ticketModalOpen = signal(false);
  readonly mutating  = this.store.selectSignal(selectMutating);
  readonly patient   = this.store.selectSignal(selectResolvedPatient);
  private readonly analyses = this.store.selectSignal(selectSummaryAnalyses);
  protected readonly analysisById = computed(() => new Map(this.analyses().map(a => [a.id, a])));

  ngOnInit(): void {
    const a = this.atencion();
    const p = this.patient();
    if (!p || p.id !== a.patientId) {
      if (a.patientId != null) this.store.dispatch(loadAttentionPatient({ patientId: a.patientId }));
    }
    this.store.dispatch(loadAttentionAnalyses({ analysisIds: a.analysisAuthorizations.map(x => x.analysisId) }));
  }

  openFinalize(): void { this.ticketModalOpen.set(true); }
  closeFinalize(): void { this.ticketModalOpen.set(false); }

  onFinishWithTicket(printTicket: boolean): void {
    this.ticketModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    void printTicket;
    this.waitForMutation((ok) => { if (!ok) return; clearAtencionSession(); this.finished.emit(); });
  }

  private waitForMutation(cb: (ok: boolean) => void): void {
    race(
      this.actions$.pipe(ofType(atencionMutationSuccess), take(1)),
      this.actions$.pipe(ofType(atencionMutationFailure), take(1)),
    ).pipe(takeUntilDestroyed(this.destroyRef))
     .subscribe((action) => cb(action.type === atencionMutationSuccess.type));
  }
}
```

- [ ] **Step 4: Crear el template `resumen-step.component.html`**:
```html
<div class="space-y-4">
  <header class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Resumen de la atención</h3>
    @if (atencion().isUrgent) { <p-tag value="URGENTE" severity="danger" /> }
  </header>

  <section>
    <div class="text-sm opacity-60">Paciente</div>
    @if (patient(); as p) {
      <div class="text-base font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
      <div class="text-sm opacity-70">DNI {{ p.dni }}</div>
    } @else {
      <div class="text-base">ID {{ atencion().patientId ?? '—' }}</div>
    }
  </section>

  <section>
    <div class="text-sm opacity-60">Indicaciones</div>
    <div class="text-base">{{ atencion().indications || '—' }}</div>
  </section>

  <section>
    <div class="text-sm opacity-60">Análisis solicitados ({{ atencion().analysisAuthorizations.length }})</div>
    <ul class="list-disc list-inside text-sm">
      @for (a of atencion().analysisAuthorizations; track a.analysisId) {
        @let info = analysisById().get(a.analysisId);
        <li>
          @if (info) { <span class="font-mono opacity-70">{{ info.shortCode }}</span> — {{ info.name }} }
          @else { #{{ a.analysisId }} }
        </li>
      }
    </ul>
  </section>

  <div class="flex justify-end">
    <p-button label="Finalizar atención" icon="pi pi-check"
              [loading]="mutating()" [disabled]="mutating()" (onClick)="openFinalize()" />
  </div>

  <lab-attention-ticket-modal [visible]="ticketModalOpen()"
    (confirmed)="onFinishWithTicket($event)" (dismissed)="closeFinalize()" />
</div>
```
(Si el bundler de tests rechaza `templateUrl` —como pasó en KAN-77—, pasá el HTML a `template:` inline en el `.ts` y borrá el `.html`.)

- [ ] **Step 5: Correr y ver pasar:** `npx ng test --include="src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/*.spec.ts" --watch=false` → PASS. Luego `npm run build` → OK.

- [ ] **Step 6: Commit**
```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/
git commit -m "feat(atencion): resumen muestra paciente y nombres de analisis"
```

---

## Task 4: `CancelAttentionModalComponent` (nuevo)

**Files:**
- Create: `src/app/features/analitica/components/cancel-attention-modal/cancel-attention-modal.component.ts`
- Test: `src/app/features/analitica/components/cancel-attention-modal/cancel-attention-modal.component.spec.ts`

- [ ] **Step 1: Test (falla primero)**:
```ts
import { TestBed } from '@angular/core/testing';
import { CancelAttentionModalComponent } from './cancel-attention-modal.component';

describe('CancelAttentionModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CancelAttentionModalComponent] }).compileComponents();
  });

  it('no emite confirmed sin motivo; con motivo emite el texto', () => {
    const f = TestBed.createComponent(CancelAttentionModalComponent);
    const c = f.componentInstance;
    f.componentRef.setInput('visible', true);
    f.detectChanges();
    let emitted: string | undefined;
    c.confirmed.subscribe((r: string) => (emitted = r));

    c.confirm();                 // sin motivo
    expect(emitted).toBeUndefined();

    c.setReason('Paciente no se presentó');  // motivo rápido
    c.confirm();
    expect(emitted).toBe('Paciente no se presentó');
  });
});
```

- [ ] **Step 2: Correr y ver fallar:** `npx ng test --include="src/app/features/analitica/components/cancel-attention-modal/*.spec.ts" --watch=false` → FAIL (no existe).

- [ ] **Step 3: Implementar el componente** (calcado de `AttentionTicketModalComponent`):
```ts
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

const MOTIVOS = ['Paciente no se presentó', 'Error de carga', 'Atención duplicada', 'A pedido del paciente'];

@Component({
  selector: 'lab-cancel-attention-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule, TextareaModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onHide()" [modal]="true" [style]="{ width: '460px' }"
              header="Cancelar atención">
      <p class="text-sm opacity-70 mb-2">Esta acción cancela la atención. Indicá el motivo.</p>
      <div class="flex flex-wrap gap-2 mb-3">
        @for (m of motivos; track m) {
          <p-button [label]="m" severity="secondary" [outlined]="true" size="small" (onClick)="setReason(m)" />
        }
      </div>
      <textarea pTextarea [(ngModel)]="reasonValue" rows="3" class="w-full"
                placeholder="Motivo de cancelación"></textarea>
      <ng-template pTemplate="footer">
        <p-button label="Volver" severity="secondary" [text]="true" (onClick)="onHide()" />
        <p-button label="Cancelar atención" severity="danger" [disabled]="!valid()" (onClick)="confirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class CancelAttentionModalComponent {
  readonly visible   = input<boolean>(false);
  readonly confirmed = output<string>();
  readonly dismissed = output<void>();

  protected readonly motivos = MOTIVOS;
  protected reasonValue = '';
  private readonly reason = signal('');

  setReason(value: string): void { this.reasonValue = value; this.reason.set(value); }
  protected valid(): boolean { return this.reasonValue.trim().length > 0; }
  confirm(): void {
    const r = this.reasonValue.trim();
    if (!r) return;
    this.confirmed.emit(r);
    this.reasonValue = '';
  }
  onHide(): void { this.dismissed.emit(); }
}
```
(Si `primeng/textarea`/`pTextarea` no existe en la versión del repo, usá `InputTextarea`/`pInputTextarea` —verificá cómo lo importan otros forms del repo— o un `<textarea>` plano con `[(ngModel)]`. El test sólo ejercita `setReason`/`confirm`, no el módulo.)

- [ ] **Step 4: Correr y ver pasar:** `npx ng test --include="src/app/features/analitica/components/cancel-attention-modal/*.spec.ts" --watch=false` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/features/analitica/components/cancel-attention-modal/
git commit -m "feat(atencion): modal de cancelacion de atencion (motivos rapidos + textarea)"
```

---

## Task 5: Wizard — mover "Cancelar" al header + usar el modal

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`

- [ ] **Step 1: Imports + estado** — importar el modal y agregar el signal:
```ts
import { CancelAttentionModalComponent } from '../../../components/cancel-attention-modal/cancel-attention-modal.component';
```
Agregar `CancelAttentionModalComponent` al array `imports` del `@Component`. En la clase:
```ts
protected readonly cancelModalOpen = signal(false);
protected canCancel(): boolean {
  const s = this.detail()?.attentionState;
  return s != null && !isTerminal(s) && !this.isPostSecretary();
}
```

- [ ] **Step 2: Header (detail mode)** — reemplazar el bloque del header de detalle (el que tiene `Atención {{ detail()!.attentionNumber }}` + "Volver al listado") para agrupar Cancelar a la izquierda de Volver:
```html
<div class="flex items-center gap-2">
  @if (canCancel()) {
    <p-button label="Cancelar atención" severity="danger" [text]="true" (onClick)="onCancel()" />
  }
  <p-button label="Volver al listado" severity="secondary" [text]="true" (onClick)="back()" />
</div>
```
(Reemplaza el `<p-button label="Volver al listado" ... />` suelto del header de detalle. NO toques el header del modo "creating".)

- [ ] **Step 3: Bottom bar** — quitar el botón "Cancelar atención" del bottom (dejar solo "Volver fase"):
```html
<div class="flex justify-between mt-4">
  <p-button label="Volver fase" severity="secondary" [outlined]="true"
            [disabled]="mutating() || !canReturn()" (onClick)="onReturnPhase()" />
</div>
```

- [ ] **Step 4: Hostear el modal** — agregar al final del template raíz del componente (después del `<div class="p-6 max-w-4xl mx-auto"> … </div>`, dentro del mismo template):
```html
<lab-cancel-attention-modal [visible]="cancelModalOpen()"
  (confirmed)="onCancelConfirmed($event)" (dismissed)="cancelModalOpen.set(false)" />
```

- [ ] **Step 5: Métodos** — reemplazar el `onCancel()` (que usaba `window.prompt`) por abrir el modal, y agregar el confirm:
```ts
onCancel(): void {
  if (!this.detail()) return;
  this.cancelModalOpen.set(true);
}
onCancelConfirmed(reason: string): void {
  const d = this.detail();
  if (!d) return;
  this.cancelModalOpen.set(false);
  this.store.dispatch(cancelAtencion({ id: d.id, payload: { cancellationReason: reason } }));
  clearAtencionSession();
}
```
(`cancelAtencion`, `clearAtencionSession`, `isTerminal`, `signal` ya están importados en el wizard.)

- [ ] **Step 6: Build + smoke spec** — `npm run build` → OK. Si existe `atencion-wizard.component.spec.ts`, agregar/ajustar:
```ts
it('onCancelConfirmed despacha cancelAtencion con el motivo', () => {
  // setup con detail en estado cancelable (ver el spec existente del wizard)
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.onCancelConfirmed('Error de carga');
  expect(spy).toHaveBeenCalledWith(cancelAtencion({ id: 1, payload: { cancellationReason: 'Error de carga' } }));
});
```
Run: `npx ng test --include="src/app/features/analitica/pages/atencion/atencion-wizard/*.spec.ts" --watch=false` → PASS.

- [ ] **Step 7: Commit**
```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "feat(atencion): cancelar atencion en el header + modal (sin window.prompt)"
```

---

## Task 6: Verificación integral

**Files:** ninguno.

- [ ] **Step 1: Specs tocados** (vitest store + ng test componentes):
```bash
npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts
npx ng test --include="src/app/features/analitica/pages/atencion/atencion-wizard/**/*.spec.ts" --watch=false
npx ng test --include="src/app/features/analitica/components/cancel-attention-modal/*.spec.ts" --watch=false
```
Expected: todo verde.

- [ ] **Step 2: Build:** `npm run build` → OK (sin errores nuevos).

- [ ] **Step 3: Smoke manual** (con la app levantada): abrir una atención en fase de secretaría → el Resumen muestra `Apellido, Nombre · DNI` y los análisis por nombre; "Cancelar atención" está en el header (izq de "Volver al listado") y abre el modal con motivos rápidos; confirmar cancela.

---

## Self-Review (cobertura del spec)

- **§4/§5 datos paciente:** Task 1 (load) + Task 3 (render `Apellido, Nombre · DNI` + fallback). ✔
- **§4/§5 nombres de análisis:** Task 2 (load forkJoin) + Task 3 (render `shortCode — name` + fallback `#id`). ✔
- **§6 mover Cancelar al header (izq de Volver), gateado:** Task 5 (header + `canCancel()` + quitar del bottom). ✔
- **§7 modal de cancelación:** Task 4 (componente) + Task 5 (host + `onCancelConfirmed`). ✔
- **§8 errores español/sin leak:** failures van a slices sin renderizar el error crudo; fallback visible. ✔
- **§9 testing:** Tasks 1,2,3,4,5 con specs + Task 6. ✔
- **Type consistency:** `loadAttentionPatient({patientId})`, `loadAttentionAnalyses({analysisIds})`/`attentionAnalysesLoaded({analyses})`, `selectSummaryAnalyses`, `summaryAnalyses` usados igual en state/actions/reducer/effects/selectors/componente. `cancelAtencion({id, payload:{cancellationReason}})` igual que el existente. ✔
- **Placeholders:** sin TODO/TBD; las notas "si el bundler rechaza templateUrl"/"si pTextarea no existe" son contingencias verificables, no placeholders de implementación.
