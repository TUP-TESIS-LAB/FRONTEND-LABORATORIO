# Turnos UX LAB Deep Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-05-28-turnos-ux-lab-deep-review-design.md`
> **Branch:** `feat/turnos-ux-lab` (LAB) — ya pusheada, HEAD `7747288`
> **Jira:** TBD — crear tras este plan vía `jira-workflow` (subtarea o related de KAN-48)

**Goal:** Aplicar 13 fixes de polish (3 tokens + 5 UX + 5 polish del spec) en 11 commits sobre `feat/turnos-ux-lab` para dejar el branch listo para el smoke final del usuario con cambios mínimos. Dos pares de fixes se agrupan en un mismo commit por tocar el mismo archivo: UX-2 + UX-5 (wizard.page.ts) y UX-3 + UX-4 (configuracion-list.page.ts).

**Architecture:** Tres olas secuenciales — tokens (mecánico, sin lógica) → UX bugs (lógica simple sobre signals/forms) → polish (validators + cleanup). Cada fix es un commit independiente sobre `feat/turnos-ux-lab` y no introduce features nuevas.

**Tech Stack:** Angular 21 standalone components, signals, ReactiveForms, NgRx classic, PrimeNG 21, vitest, jsdom.

---

## Convenciones a respetar

- Commits convencionales (`fix(turnos): ...` / `feat(turnos): ...`). NO `--no-verify`.
- Cada task = un commit. Si vitest o tsc fallan, fix antes de pasar a la siguiente task.
- NO tocar tests del numpad ni del agenda-error-mapper salvo que un fix los rompa.
- Working directory: `C:\Users\Mateo\Desktop\tesis\FRONTEND-LABORATORIO`. Antes de empezar verificar branch: `git rev-parse --abbrev-ref HEAD` → `feat/turnos-ux-lab`.

---

# FASE 1 — Tokens PrimeNG 21 rotos (mecánico)

## Task 1: TK-1 — step-periodo day-chips usan tokens reales

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.scss:62-85`

- [ ] **Step 1: Reemplazar bloque `.day-chip` completo**

Buscar el bloque que actualmente arranca en línea 62 (`.day-chip { width: 3rem; ...`) y reemplazarlo por:

```scss
.day-chip {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f3f4f6;
  }

  &.selected {
    background: var(--brand-primary);
    color: var(--p-primary-contrast-color);
    border-color: var(--brand-primary);
  }
}
```

- [ ] **Step 2: Confirmar 0 referencias a tokens rotos en el archivo**

```bash
grep -E "var\(--(surface-(card|border|hover|200|400)|primary-color|primary-color-text)\)" src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.scss
```

Expected: empty output (0 matches).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.scss
git commit -m "fix(turnos): step-periodo day-chips usan tokens reales (PrimeNG 21)"
```

---

## Task 2: TK-2 — totem-numpad inline styles usan tokens reales

**Files:**
- Modify: `src/app/features/turnos/pages/totem/components/totem-numpad.component.ts:21-61` (el bloque `styles: [...]`)

- [ ] **Step 1: Reemplazar el array `styles` completo**

Reemplazar todo entre `styles: [` y el cierre `]` final (líneas 21-61) por:

```ts
  styles: [`
    .numpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      max-width: 28rem;
      margin: 0 auto;
    }

    .num-btn, .action-btn {
      min-height: 5rem;
      font-size: 2.5rem;
      font-weight: 700;
      background: #ffffff;
      border: 2px solid #d1d5db;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.05s, background 0.15s;
    }

    .num-btn:active, .action-btn:active {
      transform: scale(0.97);
      background: #f3f4f6;
    }

    .action-btn.submit {
      background: var(--brand-primary);
      color: var(--p-primary-contrast-color);
      border-color: var(--brand-primary);
    }

    .action-btn.submit:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .action-btn.clear {
      background: #e5e7eb;
    }
  `],
```

- [ ] **Step 2: Confirmar tests del numpad siguen pasando**

```bash
npx vitest run totem-numpad.component.spec
```

Expected: 4 tests pasando (digit click emit, clear emit, submit emit, submit disabled).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/totem/components/totem-numpad.component.ts
git commit -m "fix(turnos): totem-numpad usa tokens reales (PrimeNG 21)"
```

---

## Task 3: TK-3 — totem-input-dni display usa tokens reales

**Files:**
- Modify: `src/app/features/turnos/pages/totem/components/totem-input-dni.component.scss:17-29`

- [ ] **Step 1: Reemplazar bloque `.dni-display` completo**

Reemplazar el bloque que arranca en línea 17 (`.dni-display { ...`) por:

```scss
.dni-display {
  font-size: 3.5rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5rem;
  background: #ffffff;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  padding: 1rem 2rem;
  min-width: 20rem;
  text-align: center;
  min-height: 5rem;
}
```

- [ ] **Step 2: Confirmar 0 tokens rotos en todo `features/turnos`**

```bash
grep -rn "var(--surface-card\|var(--surface-border\|var(--surface-hover\|var(--surface-200\|var(--surface-400\|var(--primary-color)\|var(--primary-color-text)" src/app/features/turnos/
```

Expected: empty output. Esto satisface AC #1 del spec.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/totem/components/totem-input-dni.component.scss
git commit -m "fix(turnos): totem-input-dni display usa tokens reales (PrimeNG 21)"
```

---

# FASE 2 — UX bugs

## Task 4: UX-1 — step-confirmar muestra días con labels en castellano

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.html:19`

- [ ] **Step 1: Agregar map + método al component**

En `step-confirmar.component.ts`, dentro de la class `StepConfirmarComponent` (después de los `@Output() back`), agregar:

```ts
  protected readonly DAY_LABELS: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    7: 'Dom',
  };

  protected formatDays(days: number[]): string {
    return days.map(d => this.DAY_LABELS[d] ?? '?').join(', ');
  }
```

- [ ] **Step 2: Reemplazar template line 19**

Buscar `<p>Días: {{ summary.periodo.daysOfWeek.join(', ') }}</p>` y reemplazar por:

```html
<p>Días: {{ formatDays(summary.periodo.daysOfWeek) }}</p>
```

- [ ] **Step 3: Verificar tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.{ts,html}
git commit -m "fix(turnos): step-confirmar muestra dias con labels (Lun, Mar, ...)"
```

---

## Task 5: UX-2 + UX-5 — agenda-wizard pre-carga branchName (edit) + lee queryParams.branchId

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.ts:95-135`

- [ ] **Step 1: Reemplazar bloque `ngOnInit()` completo**

Buscar el método `ngOnInit(): void {` (línea 95) y reemplazar hasta su `}` final (línea 135) por:

```ts
  ngOnInit(): void {
    const agenda = this.route.snapshot.data['agenda'] as AgendaConfig | null;
    if (agenda) {
      this.editingId.set(agenda.id);
      this.branchId.set(agenda.branchId);

      // Parse stored "HH:mm:ss" or "HH:mm" back to "HH:mm"
      const fromTime = agenda.startTime.slice(0, 5);
      const toTime = agenda.endTime.slice(0, 5);

      this.horario.set({
        fromTime,
        toTime,
        slotDurationMinutes: agenda.slotDurationMinutes,
        patientsPerSlot: agenda.patientsPerSlot,
      });

      // Convert "MONDAY,TUESDAY" → ISO number array
      const dayNames = agenda.recurringDaysOfWeek?.split(',') ?? [];
      const weekdayToIso: Record<string, number> = {
        MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
        FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
      };
      const daysOfWeek = dayNames
        .map(d => weekdayToIso[d])
        .filter(Boolean)
        .sort((a, b) => a - b);

      this.periodo.set({
        daysOfWeek,
        validFrom: new Date(agenda.validFromDate + 'T00:00:00'),
        validTo: agenda.validToDate
          ? new Date(agenda.validToDate + 'T00:00:00')
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      // Placeholder mientras carga el nombre real
      this.branchName.set(`Sucursal #${agenda.branchId}`);

      // Pre-cargar nombre real para que el summary no muestre "#5"
      this.loadBranchName(agenda.branchId);
    } else {
      // Pre-seleccionar branch desde queryParams (set por "Agregar" en accordion)
      const queryBranchId = this.route.snapshot.queryParamMap.get('branchId');
      if (queryBranchId) {
        const branchId = Number(queryBranchId);
        if (!Number.isNaN(branchId)) {
          this.branchId.set(branchId);
          this.loadBranchName(branchId);
        }
      }
    }
  }

  private loadBranchName(branchId: number): void {
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        const branch = list.find(b => b.id === branchId);
        if (branch) this.branchName.set(branch.name);
      });
  }
```

- [ ] **Step 2: Verificar imports**

`take` y `takeUntilDestroyed` ya están importados en la cabecera del archivo. Confirmar con:

```bash
grep -n "import.*take\b\|import.*takeUntilDestroyed" src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.ts
```

Expected: 2 líneas (una para `take` de `rxjs/operators`, otra para `takeUntilDestroyed` de `@angular/core/rxjs-interop`).

- [ ] **Step 3: tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.ts
git commit -m "fix(turnos): wizard pre-carga branchName (edit) + lee queryParams.branchId (nueva)"
```

---

## Task 6: UX-3 + UX-4 — configuracion-list usa nombres reales de sucursales + carga agendas de todas

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/configuracion-list.page.ts`

- [ ] **Step 1: Agregar imports**

En la cabecera del archivo, después de los imports existentes, agregar:

```ts
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SucursalesService } from '../../../sucursales/services/sucursales.service';
```

- [ ] **Step 2: Inyectar DestroyRef + SucursalesService y agregar signal**

Dentro de `ConfiguracionListPage`, después de `private session = inject(UserSessionService);` (línea ~54) agregar:

```ts
  private readonly destroyRef = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);

  private readonly branchesFromService = signal<{ id: number; name: string }[]>([]);
```

- [ ] **Step 3: Reemplazar el computed `branches`**

Buscar el bloque (línea ~71-74):

```ts
  protected branches = computed(() => {
    const map = this.configsByBranch();
    return Object.keys(map).map(id => ({ id: Number(id), name: `Sucursal ${id}` }));
  });
```

y reemplazarlo por:

```ts
  protected branches = computed(() => {
    const fromService = this.branchesFromService();
    if (fromService.length > 0) return fromService;
    // Fallback mientras llega la respuesta del service: derivar del map de agendas
    const map = this.configsByBranch();
    return Object.keys(map).map(id => ({ id: Number(id), name: `Sucursal ${id}` }));
  });
```

- [ ] **Step 4: Reemplazar `ngOnInit()` completo**

Buscar el método `ngOnInit(): void {` (línea ~86) y reemplazar hasta su `}` final por:

```ts
  ngOnInit(): void {
    // Cargar branches accesibles desde el service de sucursales
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.branchesFromService.set(list);
        // Dispatch loadAgendas por cada branch accesible (UX-4)
        list.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      });

    // Default filter a la branch del usuario actual si la conocemos
    const userBranch = this.session.currentUser()?.branch;
    if (userBranch != null) {
      this._filterBranchId.set(userBranch);
    }
  }
```

- [ ] **Step 5: tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/configuracion-list.page.ts
git commit -m "fix(turnos): configuracion-list usa nombres reales + carga agendas de todas las branches"
```

---

# FASE 3 — Polish

## Task 7: PL-1 — step-periodo valida validFrom < validTo (TDD)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.spec.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.html`

- [ ] **Step 1: Escribir test que falla**

Crear `step-periodo.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { StepPeriodoComponent } from './step-periodo.component';

describe('StepPeriodoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StepPeriodoComponent] });
  });

  it('marca el form como invalid si validFrom >= validTo', () => {
    const fixture = TestBed.createComponent(StepPeriodoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const form = component['form'];
    form.patchValue({
      validFrom: new Date('2026-06-15'),
      validTo: new Date('2026-06-15'),
    });

    expect(form.hasError('dateRangeInvalid')).toBe(true);
    expect(form.invalid).toBe(true);
  });

  it('acepta el form si validFrom < validTo', () => {
    const fixture = TestBed.createComponent(StepPeriodoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const form = component['form'];
    form.patchValue({
      validFrom: new Date('2026-06-01'),
      validTo: new Date('2026-06-30'),
    });

    expect(form.hasError('dateRangeInvalid')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr test → debe fallar**

```bash
npx vitest run step-periodo.component.spec
```

Expected: FAIL — `Expected true to be true` (`hasError('dateRangeInvalid')` devuelve false porque el validator no existe).

- [ ] **Step 3: Implementar validator + aplicarlo al form**

En `step-periodo.component.ts`, después de la función `minOneDay` (línea ~26-29), agregar:

```ts
function dateRangeValid(control: AbstractControl): ValidationErrors | null {
  const from = control.get('validFrom')?.value as Date | null;
  const to = control.get('validTo')?.value as Date | null;
  if (!from || !to) return null;
  const fromTime = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const toTime = to instanceof Date ? to.getTime() : new Date(to).getTime();
  return fromTime < toTime ? null : { dateRangeInvalid: true };
}
```

Y en el bloque del `form` (línea ~56), pasar el validator como segundo arg:

```ts
  protected readonly form = this.fb.nonNullable.group(
    {
      daysOfWeek: [[1, 2, 3, 4, 5] as number[], [Validators.required, minOneDay]],
      validFrom: [new Date(), Validators.required],
      validTo: [new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), Validators.required],
    },
    { validators: [dateRangeValid] },
  );
```

- [ ] **Step 4: Mostrar error en template**

En `step-periodo.component.html`, justo después del cierre del segundo `</div>` de `.form-row` (línea ~48) y antes del `<footer>`, agregar:

```html
    @if (form.hasError('dateRangeInvalid') && (form.controls.validFrom.touched || form.controls.validTo.touched)) {
      <small class="field-error">La fecha "Válido desde" debe ser anterior a "Válido hasta".</small>
    }
```

- [ ] **Step 5: Correr tests → deben pasar**

```bash
npx vitest run step-periodo.component.spec
```

Expected: 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.{ts,html,spec.ts}
git commit -m "feat(turnos): step-periodo valida validFrom < validTo"
```

---

## Task 8: PL-2 — step-horario valida fromTime < toTime (TDD)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.spec.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.html`

- [ ] **Step 1: Escribir test que falla**

Crear `step-horario.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { StepHorarioComponent } from './step-horario.component';

describe('StepHorarioComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StepHorarioComponent] });
  });

  it('marca invalid si fromTime >= toTime', () => {
    const fixture = TestBed.createComponent(StepHorarioComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance['form'];

    form.patchValue({ fromTime: '17:00', toTime: '09:00' });

    expect(form.hasError('timeRangeInvalid')).toBe(true);
    expect(form.invalid).toBe(true);
  });

  it('acepta si fromTime < toTime', () => {
    const fixture = TestBed.createComponent(StepHorarioComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance['form'];

    form.patchValue({ fromTime: '09:00', toTime: '17:00' });

    expect(form.hasError('timeRangeInvalid')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr test → debe fallar**

```bash
npx vitest run step-horario.component.spec
```

Expected: FAIL.

- [ ] **Step 3: Implementar validator + aplicarlo**

En `step-horario.component.ts`, agregar imports `AbstractControl, ValidationErrors` desde `@angular/forms` (sumar a la línea de import existente):

```ts
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
```

Y antes del `@Component` decorator, agregar:

```ts
function timeRangeValid(control: AbstractControl): ValidationErrors | null {
  const from = control.get('fromTime')?.value as string | null;
  const to = control.get('toTime')?.value as string | null;
  if (!from || !to) return null;
  // String compare funciona para formato "HH:mm" porque es lexicográficamente ordenado
  return from < to ? null : { timeRangeInvalid: true };
}
```

Y en el bloque del `form` (línea ~37), pasar el validator como segundo arg:

```ts
  protected readonly form = this.fb.nonNullable.group(
    {
      fromTime: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      toTime: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
      patientsPerSlot: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    },
    { validators: [timeRangeValid] },
  );
```

- [ ] **Step 4: Mostrar error en template**

En `step-horario.component.html`, después del cierre del segundo `</div>` del PRIMER `.form-row` (que contiene fromTime/toTime) — línea ~31 aprox — y antes del segundo `<div class="form-row">`, agregar:

```html
    @if (form.hasError('timeRangeInvalid') && (form.controls.fromTime.touched || form.controls.toTime.touched)) {
      <small class="field-error">La hora "Desde" debe ser anterior a "Hasta".</small>
    }
```

- [ ] **Step 5: Correr tests → deben pasar**

```bash
npx vitest run step-horario.component.spec
```

Expected: 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.{ts,html,spec.ts}
git commit -m "feat(turnos): step-horario valida fromTime < toTime"
```

---

## Task 9: PL-3 — agenda-wizard.confirm() usa race + cleanup en re-confirm

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.ts`

- [ ] **Step 1: Agregar imports y Subject**

En la cabecera del archivo, después del import de `rxjs/operators`, agregar:

```ts
import { race, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
```

(Si `takeUntil` ya estaba importado por otro lado, no duplicar — solo agregarlo si falta.)

Dentro de la clase, junto a los otros `private readonly`, agregar:

```ts
  private readonly cancelInFlight = new Subject<void>();
```

- [ ] **Step 2: Reemplazar el método `confirm()` completo**

Buscar `confirm(): void {` (línea ~161) y reemplazar hasta el cierre `}` (línea ~246) por:

```ts
  confirm(): void {
    if (!this.canShowConfirmar()) return;

    // Cancelar cualquier subscription previa (si el user re-confirma tras un error)
    this.cancelInFlight.next();
    this.saving.set(true);

    const h = this.horario()!;
    const p = this.periodo()!;
    const recurringDaysOfWeek = p.daysOfWeek
      .map(n => ISO_TO_WEEKDAY[n])
      .filter(Boolean)
      .join(',');

    const editId = this.editingId();
    const isEdit = editId != null;

    // El request del backend para create/update comparte estos campos.
    // `branchId` SOLO va dentro del request en create; en update va como arg separado de la action.
    const baseRequest = {
      startTime: h.fromTime,
      endTime: h.toTime,
      slotDurationMinutes: h.slotDurationMinutes,
      patientsPerSlot: h.patientsPerSlot,
      isRecurring: recurringDaysOfWeek.length > 0,
      validFromDate: this.toIsoDate(p.validFrom),
      validToDate: this.toIsoDate(p.validTo),
      recurringDaysOfWeek: recurringDaysOfWeek || undefined,
    };

    if (isEdit) {
      this.store.dispatch(
        updateAgenda({ id: editId!, branchId: this.branchId()!, request: baseRequest }),
      );
    } else {
      this.store.dispatch(
        createAgenda({ request: { branchId: this.branchId()!, ...baseRequest } }),
      );
    }

    const success$ = this.actions$.pipe(
      ofType(isEdit ? updateAgendaSuccess : createAgendaSuccess),
    );
    const failure$ = this.actions$.pipe(
      ofType(isEdit ? updateAgendaFailure : createAgendaFailure),
    );

    race(success$, failure$)
      .pipe(
        take(1),
        takeUntil(this.cancelInFlight),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(action => {
        this.saving.set(false);
        if ('error' in action) {
          const mapped = mapAgendaError(action.error as any);
          this.messageService.add({
            severity: mapped.severity,
            summary: 'Error',
            detail: mapped.message,
          });
        } else {
          this.router.navigate(['/turnos/configuracion']);
        }
      });
  }
```

- [ ] **Step 3: tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Si tsc se queja de `'error' in action`, el type narrowing está bien — los `*Failure` actions del store tienen un field `error` por el patrón NgRx.

- [ ] **Step 4: Correr tests existentes**

```bash
npx vitest run
```

Expected: todos los tests pasando (incluyendo step-periodo + step-horario nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.ts
git commit -m "fix(turnos): wizard confirm() usa race + cleanup de re-confirm rapido"
```

---

## Task 10: PL-4 — sacar `:host { padding: 1.5rem }` duplicado (shell ya da 24px)

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.scss:1-4`
- Modify: `src/app/features/turnos/pages/configuracion/configuracion-list.page.scss:1-4`

**Razón:** `admin-shell.component.ts:61` setea `padding: var(--space-6)` (= 24px) en `.ui-admin-shell__content`. Ambas páginas duplican esto con `:host { padding: 1.5rem }` = 24px → 48px total. Mismo bug que el alta-page de sucursales fixed en commit `c8d9ad7`.

- [ ] **Step 1: Quitar padding del `:host` en agenda-wizard.page.scss**

Reemplazar el bloque inicial (líneas 1-4):

```scss
:host {
  display: block;
  padding: 1.5rem;
}
```

por:

```scss
:host {
  display: block;
}
```

- [ ] **Step 2: Quitar padding del `:host` en configuracion-list.page.scss**

Reemplazar el bloque inicial (líneas 1-4):

```scss
:host {
  display: block;
  padding: 1.5rem;
}
```

por:

```scss
:host {
  display: block;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.scss src/app/features/turnos/pages/configuracion/configuracion-list.page.scss
git commit -m "fix(turnos): quitar padding duplicado del :host (admin-shell ya da 24px)"
```

---

## Task 11: PL-5 — configuracion-list "Reintentar" usa método explícito

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/configuracion-list.page.ts`
- Modify: `src/app/features/turnos/pages/configuracion/configuracion-list.page.html:40`

- [ ] **Step 1: Agregar método `reload()` al component**

En `configuracion-list.page.ts`, dentro de la clase, al final (antes de `}` de cierre de la clase), agregar:

```ts
  protected reload(): void {
    const branches = this.branchesFromService();
    if (branches.length > 0) {
      branches.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      return;
    }
    // Fallback: si las branches aún no llegaron, re-ejecutar todo el flow de ngOnInit
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.branchesFromService.set(list);
        list.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      });
  }
```

- [ ] **Step 2: Reemplazar el handler del botón en template**

En `configuracion-list.page.html:40`, buscar:

```html
<p-button label="Reintentar" severity="secondary" (onClick)="ngOnInit()" />
```

y reemplazar por:

```html
<p-button label="Reintentar" severity="secondary" (onClick)="reload()" />
```

- [ ] **Step 3: tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/configuracion-list.page.{ts,html}
git commit -m "fix(turnos): configuracion-list reintentar usa metodo explicito"
```

---

# FASE 4 — Verify & push

## Task 12: Verify + push

- [ ] **Step 1: Final grep — confirmar 0 tokens rotos en `features/turnos`**

```bash
grep -rn "var(--surface-card\|var(--surface-border\|var(--surface-hover\|var(--surface-200\|var(--surface-400\|var(--primary-color)\|var(--primary-color-text)" src/app/features/turnos/
```

Expected: empty output. Esto cierra AC #1 del spec.

- [ ] **Step 2: tsc**

```bash
npx tsc --noEmit
```

Expected: 0 errors. AC #2.

- [ ] **Step 3: vitest run**

```bash
npx vitest run
```

Expected: todos los tests passing. Conteo esperado vs antes: +4 tests nuevos (2 step-periodo + 2 step-horario). Total ≥ baseline + 4. AC #3.

- [ ] **Step 4: git status — working tree limpio**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. AC #4.

- [ ] **Step 5: git log delta vs origin**

```bash
git log --oneline origin/feat/turnos-ux-lab..HEAD
```

Expected: 11 commits nuevos (TK-1, TK-2, TK-3, UX-1, UX-2+5, UX-3+4, PL-1, PL-2, PL-3, PL-4, PL-5).

- [ ] **Step 6: Push**

```bash
git push origin feat/turnos-ux-lab
```

Expected: push exitoso. El branch ya estaba pusheado, esto agrega los 11 commits delta. NO abrir PR — el branch quedará listo para que el usuario abra PR cuando lo decida.

---

## Estado final esperado

- 11 commits adicionales sobre `7747288` (HEAD previo de `feat/turnos-ux-lab`).
- 0 tokens PrimeNG 21 legacy rotos en `features/turnos`.
- +4 tests nuevos (validators de step-periodo + step-horario).
- `npx tsc --noEmit` y `npx vitest run` ambos verdes.
- Working tree limpio, branch pusheada.
- Usuario hace smoke E2E en browser después (wizard nueva agenda + edit, tótem, TV display, lista con filtro por sucursal).
