# Turnos UX LAB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-05-26-turnos-cierre-ux-y-sucursales-back-office-design.md` §5
> **Repo:** `FRONTEND-LABORATORIO`
> **Branch:** `feat/turnos-ux-lab` (sale de `origin/development` HEAD `afa49d7`)
> **Jira:** [KAN-48](https://exequielsantoro.atlassian.net/browse/KAN-48) — relates to KAN-41 (cierre TURNOS anterior)

**Goal:** Cerrar los pendientes UX de TURNOS en LAB: rediseñar el wizard de agendas al patrón del portal, agregar sidebar item, extender el mapper de errores, transformar la pantalla TV display al layout 70/30 con overlay de audio, y reemplazar el input del tótem por un numpad touch-friendly.

**Architecture:** Tres áreas independientes dentro de `features/turnos`: (a) reescritura del wizard de agendas en `pages/configuracion/agenda-wizard/` con sub-components por step; (b) cambios en `pages/display/display.component.*` para layout 70/30 + audio overlay; (c) nuevo `pages/totem/components/totem-numpad.component.*` cableado al input de DNI.

**Tech Stack:** Angular 21, NgRx classic, signals, PrimeNG 21, RxJS, vitest, jsdom.

---

## Convenciones a respetar

- Standalone components, OnPush, signals.
- NgRx classic para flow de agendas (ya existe en `store/agendas/`).
- TDD para mapper extension, navegación entre steps. UI primero para layouts visuales.
- Commits convencionales. NO `--no-verify`.

---

## File Structure

### Files nuevos

- `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.{ts,html,scss}` (reescribe `agenda-wizard.page.*` actual)
- `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-sucursal.component.{ts,html,scss}`
- `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.{ts,html,scss}`
- `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.{ts,html,scss}`
- `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.{ts,html,scss}`
- `src/app/features/turnos/pages/totem/components/totem-numpad.component.{ts,html,scss}`
- `src/app/features/turnos/pages/totem/components/totem-numpad.component.spec.ts`
- `src/assets/beep.mp3` (si no existe ya)

### Files modificados

- `src/app/features/turnos/utils/agenda-error-mapper.ts` (extension de casos)
- `src/app/features/turnos/utils/agenda-error-mapper.spec.ts` (tests nuevos)
- `src/app/features/turnos/pages/display/display.component.{ts,html,scss}` (layout 70/30 + fondo claro + audio overlay)
- `src/app/features/turnos/pages/totem/components/totem-input-dni.component.{ts,html,scss}` (usar numpad)
- `src/app/layout/sidebar/sidebar.nav.ts` (item "Configuración de agendas")
- `src/app/features/turnos/pages/configuracion/agenda-wizard.page.{ts,html,scss}` → eliminar al final (reemplazado por nuevo directorio)

### Files a auditar (sin necesariamente modificar)

- `src/app/features/turnos/store/agendas/agendas.effects.ts` (verificar que `catchError` use `mapAgendaError`)
- Otros `effects.ts` en `features/turnos/store/` que disparen requests relacionadas a agendas.

---

# FASE 1 — Sidebar + Error mapper

## Task 1: Sidebar item para Configuración de agendas

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Localizar grupo Turnos en sidebar.nav.ts**

```bash
grep -n "Turnos\|turnos" src/app/layout/sidebar/sidebar.nav.ts
```

- [ ] **Step 2: Agregar item**

```ts
{
  label: 'Configuración de agendas',
  icon: 'pi pi-calendar-plus',
  routerLink: '/turnos/configuracion',
  roleKey: 'ADMINISTRADOR',
}
```

Ubicarlo dentro del array de items del grupo Turnos.

- [ ] **Step 3: Verificar visualmente**

```bash
npm start
```

Login admin → ver item nuevo en sidebar → click → llega a `/turnos/configuracion`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(turnos): sidebar item for configuración de agendas"
```

---

## Task 2: Auditar consumers del agenda-error-mapper

**Files:**
- Audit: `src/app/features/turnos/**/*.{ts}`

- [ ] **Step 1: Localizar todos los catches en turnos**

```bash
grep -rn "catchError\|subscribe.*err" src/app/features/turnos/ --include="*.ts"
```

- [ ] **Step 2: Por cada match, verificar que use `mapAgendaError`**

Patrón esperado:

```ts
import { mapAgendaError } from '../../utils/agenda-error-mapper';

// dentro del effect:
catchError((err: HttpErrorResponse) => {
  const mapped = mapAgendaError(err);
  // dispatch action con mapped.message
  return of(failureAction({ error: mapped.message, ...rest }));
})
```

- [ ] **Step 3: Cablear los que no lo usan**

Anotar en lista cuáles y corregir uno por uno. Probable: `agendas.effects.ts` ya lo usa; revisar `branch-totem-config.effects.ts`, `queue.effects.ts`, `totem.effects.ts` si tienen catches.

- [ ] **Step 4: Commit (si hubo cambios)**

```bash
git add src/app/features/turnos/
git commit -m "fix(turnos): use mapAgendaError consistently across all effects"
```

---

## Task 3: Extender `agenda-error-mapper` con casos faltantes (TDD)

**Files:**
- Modify: `src/app/features/turnos/utils/agenda-error-mapper.ts`
- Modify: `src/app/features/turnos/utils/agenda-error-mapper.spec.ts`

- [ ] **Step 1: Escribir test que falla — caso "overlap message en inglés sin code"**

```ts
// agenda-error-mapper.spec.ts
import { HttpErrorResponse } from '@angular/common/http';
import { mapAgendaError } from './agenda-error-mapper';

it('reconoce mensaje literal de overlap aunque no venga el code AGENDA_CONFIG_OVERLAP', () => {
  const err = new HttpErrorResponse({
    status: 400,
    error: { message: 'An agenda configuration with overlapping time range and date period already exists for this branch' },
  });
  const result = mapAgendaError(err);
  expect(result.display).toBe('toast');
  expect(result.severity).toBe('error');
  expect(result.message).toContain('superpone');
  expect(result.returnToStep).toBe(3);
});
```

- [ ] **Step 2: Run test** → debe fallar (el actual cae al default `'Ocurrió un error inesperado'`).

```bash
npx vitest run agenda-error-mapper.spec
```

- [ ] **Step 3: Implementar el fallback en el mapper**

```ts
// agenda-error-mapper.ts — antes del default final
if (error.status === 400 && apiMessage && /overlap/i.test(apiMessage)) {
  return {
    display: 'toast',
    severity: 'error',
    message: 'La agenda se superpone con otra ya configurada en esta sucursal. Ajustá el horario o el período.',
    returnToStep: 3,
  };
}
```

- [ ] **Step 4: Run test** → debe pasar.

- [ ] **Step 5: Agregar test para mensaje crudo de bean validation**

```ts
it('reemplaza mensajes técnicos de bean validation por texto en español', () => {
  const err = new HttpErrorResponse({
    status: 400,
    error: { message: 'must not be null' },
  });
  const result = mapAgendaError(err);
  expect(result.message).not.toContain('must not be null');
  expect(result.message).toMatch(/revis|complet|requerid/i);
});
```

- [ ] **Step 6: Implementar fallback de bean validation**

```ts
// agenda-error-mapper.ts
const TECHNICAL_LEAK_PATTERNS = [
  /^must not be null/i,
  /^must not be blank/i,
  /^must be greater than/i,
  /^must be less than/i,
  /^size must be between/i,
];

// en el mapper, antes del default:
if (error.status === 400 && apiMessage && TECHNICAL_LEAK_PATTERNS.some(p => p.test(apiMessage))) {
  return {
    display: 'toast',
    severity: 'error',
    message: 'Revisá que todos los campos requeridos estén completos.',
  };
}
```

- [ ] **Step 7: Run test** → pasa.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/turnos/utils/agenda-error-mapper.*
git commit -m "feat(turnos): extend agenda error mapper with overlap literal + bean validation fallbacks"
```

---

# FASE 2 — Wizard de agendas reescrito

## Task 4: Step 1 — Sucursal (sub-component)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-sucursal.component.{ts,html,scss}`

- [ ] **Step 1: Component con select del listado de branches**

```ts
import { ChangeDetectionStrategy, Component, OnInit, Output, EventEmitter, signal, inject, Input } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

@Component({
  selector: 'app-step-sucursal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, SelectModule],
  templateUrl: './step-sucursal.component.html',
  styleUrl: './step-sucursal.component.scss',
})
export class StepSucursalComponent implements OnInit {
  @Input() initialBranchId: number | null = null;
  @Output() next = new EventEmitter<{ branchId: number }>();

  private fb = inject(FormBuilder);
  private sucursalesService = inject(SucursalesService);

  protected readonly branches = signal<{ id: number; name: string }[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    branchId: [null as number | null, Validators.required],
  });

  ngOnInit() {
    this.sucursalesService.listBranchesForSelector().subscribe(list => this.branches.set(list));
    if (this.initialBranchId != null) this.form.patchValue({ branchId: this.initialBranchId });
  }

  submit() {
    if (this.form.invalid) return;
    this.next.emit({ branchId: this.form.value.branchId! });
  }
}
```

- [ ] **Step 2: Template**

```html
<div class="step">
  <h2>Sucursal</h2>
  <p class="muted">Elegí la sucursal para la que estás configurando la agenda.</p>

  <form [formGroup]="form" (ngSubmit)="submit()" class="form">
    <div class="form-field">
      <label>Sucursal *</label>
      <p-select formControlName="branchId" [options]="branches()" optionLabel="name" optionValue="id" placeholder="Seleccionar sucursal" />
    </div>

    <footer class="step-footer">
      <p-button label="Siguiente" type="submit" [disabled]="form.invalid" />
    </footer>
  </form>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-sucursal.component.*
git commit -m "feat(turnos): agenda wizard step 1 - sucursal selector"
```

---

## Task 5: Step 2 — Horario

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.{ts,html,scss}`

- [ ] **Step 1: Component con inputs de horario + slot duration + capacity**

```ts
@Component({ selector: 'app-step-horario', /* ... */ })
export class StepHorarioComponent {
  @Input() initial: HorarioFormValue | null = null;
  @Output() next = new EventEmitter<HorarioFormValue>();
  @Output() back = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    toTime: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
    patientsPerSlot: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  ngOnInit() {
    if (this.initial) this.form.patchValue(this.initial);
  }

  submit() {
    if (this.form.invalid) return;
    this.next.emit(this.form.getRawValue());
  }
}

export interface HorarioFormValue {
  fromTime: string;
  toTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
}
```

- [ ] **Step 2: Template con inputs + validación visible**

```html
<div class="step">
  <h2>Horario</h2>
  <p class="muted">Definí el rango de atención y la capacidad por turno.</p>

  <form [formGroup]="form" (ngSubmit)="submit()" class="form">
    <div class="form-row">
      <div class="form-field">
        <label>Desde *</label>
        <input pInputText type="time" formControlName="fromTime" />
      </div>
      <div class="form-field">
        <label>Hasta *</label>
        <input pInputText type="time" formControlName="toTime" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>Duración de cada turno (min) *</label>
        <p-inputNumber formControlName="slotDurationMinutes" [min]="5" [max]="180" [step]="5" />
      </div>
      <div class="form-field">
        <label>Pacientes por turno *</label>
        <p-inputNumber formControlName="patientsPerSlot" [min]="1" [max]="20" />
      </div>
    </div>

    <footer class="step-footer">
      <p-button label="Volver" severity="secondary" (click)="back.emit()" />
      <p-button label="Siguiente" type="submit" [disabled]="form.invalid" />
    </footer>
  </form>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-horario.component.*
git commit -m "feat(turnos): agenda wizard step 2 - horario"
```

---

## Task 6: Step 3 — Período (días + rango de fechas)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.{ts,html,scss}`

- [ ] **Step 1: Component con multi-check de días + datepicker desde-hasta**

```ts
@Component({ selector: 'app-step-periodo', /* ... */ })
export class StepPeriodoComponent {
  @Input() initial: PeriodoFormValue | null = null;
  @Output() next = new EventEmitter<PeriodoFormValue>();
  @Output() back = new EventEmitter<void>();

  protected readonly DAYS = [
    { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
    { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 7, label: 'D' },
  ];

  private fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    daysOfWeek: [[1, 2, 3, 4, 5] as number[], [Validators.required, this.minOneDay]],
    validFrom: [new Date(), Validators.required],
    validTo: [new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), Validators.required],  // default: +90 días
  });

  private minOneDay(control: { value: number[] }) {
    return control.value?.length > 0 ? null : { required: true };
  }

  toggleDay(dayId: number) {
    const current = this.form.value.daysOfWeek ?? [];
    const updated = current.includes(dayId) ? current.filter(d => d !== dayId) : [...current, dayId].sort();
    this.form.patchValue({ daysOfWeek: updated });
  }

  isSelected(dayId: number): boolean {
    return (this.form.value.daysOfWeek ?? []).includes(dayId);
  }

  submit() {
    if (this.form.invalid) return;
    this.next.emit(this.form.getRawValue() as PeriodoFormValue);
  }
}

export interface PeriodoFormValue {
  daysOfWeek: number[];   // formato ISO 1-7
  validFrom: Date;
  validTo: Date;
}
```

- [ ] **Step 2: Template con chips clickeables para días**

```html
<div class="step">
  <h2>Período</h2>
  <p class="muted">Días de la semana y rango de validez.</p>

  <form [formGroup]="form" (ngSubmit)="submit()" class="form">
    <div class="form-field">
      <label>Días de la semana *</label>
      <div class="day-chips">
        @for (d of DAYS; track d.id) {
          <button type="button" class="day-chip" [class.selected]="isSelected(d.id)" (click)="toggleDay(d.id)">
            {{ d.label }}
          </button>
        }
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>Válido desde *</label>
        <p-datePicker formControlName="validFrom" dateFormat="dd/mm/yy" />
      </div>
      <div class="form-field">
        <label>Válido hasta *</label>
        <p-datePicker formControlName="validTo" dateFormat="dd/mm/yy" />
      </div>
    </div>

    <footer class="step-footer">
      <p-button label="Volver" severity="secondary" (click)="back.emit()" />
      <p-button label="Siguiente" type="submit" [disabled]="form.invalid" />
    </footer>
  </form>
</div>
```

```scss
.day-chips { display: flex; gap: 0.5rem; }
.day-chip {
  width: 3rem; height: 3rem; border-radius: 50%;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  font-weight: 600; cursor: pointer;
  transition: all 0.15s;
}
.day-chip:hover { background: var(--surface-hover); }
.day-chip.selected {
  background: var(--primary-color); color: var(--primary-color-text);
  border-color: var(--primary-color);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-periodo.component.*
git commit -m "feat(turnos): agenda wizard step 3 - período con day chips"
```

---

## Task 7: Step 4 — Confirmar

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.{ts,html,scss}`

- [ ] **Step 1: Component read-only que recibe el state acumulado**

```ts
@Component({ selector: 'app-step-confirmar', /* ... */ })
export class StepConfirmarComponent {
  @Input({ required: true }) summary!: AgendaWizardState;
  @Output() confirm = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Input() saving = false;
}

export interface AgendaWizardState {
  branchName: string;
  horario: HorarioFormValue;
  periodo: PeriodoFormValue;
}
```

- [ ] **Step 2: Template con resumen visual**

```html
<div class="step">
  <h2>Confirmar</h2>
  <p class="muted">Revisá los datos antes de guardar.</p>

  <div class="summary-cards">
    <div class="card">
      <h3>Sucursal</h3>
      <p>{{ summary.branchName }}</p>
    </div>
    <div class="card">
      <h3>Horario</h3>
      <p>{{ summary.horario.fromTime }} – {{ summary.horario.toTime }}</p>
      <p>{{ summary.horario.slotDurationMinutes }} min · {{ summary.horario.patientsPerSlot }} pacientes/turno</p>
    </div>
    <div class="card">
      <h3>Período</h3>
      <p>Días: {{ summary.periodo.daysOfWeek.join(', ') }}</p>
      <p>{{ summary.periodo.validFrom | date:'dd/MM/yyyy' }} – {{ summary.periodo.validTo | date:'dd/MM/yyyy' }}</p>
    </div>
  </div>

  <footer class="step-footer">
    <p-button label="Volver" severity="secondary" (click)="back.emit()" [disabled]="saving" />
    <p-button label="Guardar" (click)="confirm.emit()" [loading]="saving" />
  </footer>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/turnos/pages/configuracion/agenda-wizard/steps/step-confirmar.component.*
git commit -m "feat(turnos): agenda wizard step 4 - confirmar with summary"
```

---

## Task 8: Wizard orchestrator (`agenda-wizard.page`)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.{ts,html,scss}`
- Delete (al final): `src/app/features/turnos/pages/configuracion/agenda-wizard.page.{ts,html,scss}` (legacy)

- [ ] **Step 1: Component orchestrator con state acumulado**

```ts
@Component({
  selector: 'app-agenda-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StepperModule, ButtonModule, ToastModule,
    StepSucursalComponent, StepHorarioComponent, StepPeriodoComponent, StepConfirmarComponent,
  ],
  templateUrl: './agenda-wizard.page.html',
  styleUrl: './agenda-wizard.page.scss',
  providers: [MessageService],
})
export class AgendaWizardPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);

  protected readonly currentStep = signal(1);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly branchName = signal('');

  protected readonly state = signal<Partial<AgendaWizardState>>({
    branchId: null as number | null,
    horario: null,
    periodo: null,
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(Number(id));
      this.store.dispatch(loadAgendaConfig({ id: Number(id) }));
      this.store.select(selectAgendaConfigById(Number(id)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(agenda => {
          if (!agenda) return;
          this.state.set({
            branchId: agenda.branchId,
            horario: { /* mapear desde agenda */ },
            periodo: { /* mapear desde agenda */ },
          });
        });
    }
  }

  onSucursalNext(payload: { branchId: number }) {
    this.state.update(s => ({ ...s, branchId: payload.branchId }));
    this.currentStep.set(2);
  }

  onHorarioNext(payload: HorarioFormValue) {
    this.state.update(s => ({ ...s, horario: payload }));
    this.currentStep.set(3);
  }

  onPeriodoNext(payload: PeriodoFormValue) {
    this.state.update(s => ({ ...s, periodo: payload }));
    this.currentStep.set(4);
  }

  confirm() {
    const s = this.state();
    if (!s.branchId || !s.horario || !s.periodo) return;
    this.saving.set(true);

    const dto = {
      branchId: s.branchId,
      fromTime: s.horario.fromTime,
      toTime: s.horario.toTime,
      slotDurationMinutes: s.horario.slotDurationMinutes,
      patientsPerSlot: s.horario.patientsPerSlot,
      recurringDaysOfWeek: s.periodo.daysOfWeek.join(','),
      validFrom: s.periodo.validFrom.toISOString().slice(0, 10),
      validTo: s.periodo.validTo.toISOString().slice(0, 10),
    };

    const action = this.editingId() != null
      ? updateAgendaConfig({ id: this.editingId()!, input: dto })
      : createAgendaConfig({ input: dto });

    this.store.dispatch(action);

    this.actions$.pipe(
      ofType(createAgendaConfigSuccess, updateAgendaConfigSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.saving.set(false);
      this.router.navigate(['/turnos/configuracion']);
    });

    this.actions$.pipe(
      ofType(createAgendaConfigFailure, updateAgendaConfigFailure),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.saving.set(false));
  }
}
```

- [ ] **Step 2: Template**

```html
<div class="agenda-wizard">
  <header>
    <p-button icon="pi pi-arrow-left" [text]="true" routerLink="/turnos/configuracion" />
    <h1>{{ editingId() ? 'Editar agenda' : 'Nueva agenda' }}</h1>
  </header>

  <p-stepper [(activeStep)]="currentStep" [linear]="!editingId()">
    <p-stepperPanel header="Sucursal">
      <app-step-sucursal [initialBranchId]="state().branchId" (next)="onSucursalNext($event)" />
    </p-stepperPanel>
    <p-stepperPanel header="Horario">
      <app-step-horario [initial]="state().horario" (next)="onHorarioNext($event)" (back)="currentStep.set(1)" />
    </p-stepperPanel>
    <p-stepperPanel header="Período">
      <app-step-periodo [initial]="state().periodo" (next)="onPeriodoNext($event)" (back)="currentStep.set(2)" />
    </p-stepperPanel>
    <p-stepperPanel header="Confirmar">
      <app-step-confirmar [summary]="state()" [saving]="saving()" (confirm)="confirm()" (back)="currentStep.set(3)" />
    </p-stepperPanel>
  </p-stepper>

  <p-toast />
</div>
```

- [ ] **Step 3: Actualizar ruta**

```ts
// turnos.routes.ts (o sucursales.routes.ts si la ruta vive ahí — verificar)
{
  path: 'configuracion/agenda/nueva',
  loadComponent: () => import('./pages/configuracion/agenda-wizard/agenda-wizard.page').then(m => m.AgendaWizardPage),
},
{
  path: 'configuracion/agenda/:id/editar',
  loadComponent: () => import('./pages/configuracion/agenda-wizard/agenda-wizard.page').then(m => m.AgendaWizardPage),
},
```

- [ ] **Step 4: Eliminar wizard legacy**

```bash
rm src/app/features/turnos/pages/configuracion/agenda-wizard.page.ts
rm src/app/features/turnos/pages/configuracion/agenda-wizard.page.html
rm src/app/features/turnos/pages/configuracion/agenda-wizard.page.scss
```

Actualizar imports si quedaron rotos.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/features/turnos/pages/configuracion/
git commit -m "feat(turnos): rewrite agenda wizard with 4-step stepper pattern"
```

---

# FASE 3 — TV display layout 70/30 + audio overlay

## Task 9: TV display — layout 70/30 + fondo claro

**Files:**
- Modify: `src/app/features/turnos/pages/display/display.component.{ts,html,scss}`

- [ ] **Step 1: Refactorizar template a grid 7fr 3fr**

```html
<div class="display-page">
  <main class="cola-section">
    <!-- contenido actual de la cola: en atención, próximos, etc. -->
  </main>
  <aside class="ad-section">
    <!-- mockup publicidad — placeholder -->
    <div class="ad-mockup">
      <p class="ad-label">Espacio publicitario</p>
      <p class="ad-sublabel">(mockup — configurable a futuro)</p>
    </div>
  </aside>
</div>
```

- [ ] **Step 2: Estilos del layout + fondo claro**

```scss
.display-page {
  display: grid;
  grid-template-columns: 7fr 3fr;
  height: 100vh;
  width: 100vw;
  background: #f5f7fa;  /* fondo claro */
  color: #1a1a1a;
  font-family: var(--font-family);
}

.cola-section {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ad-section {
  background: linear-gradient(135deg, #e8f0fe 0%, #f5f7fa 100%);
  border-left: 1px solid #d0d7e0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.ad-mockup {
  text-align: center;
  color: #7a8590;
}

.ad-label { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
.ad-sublabel { font-size: 0.875rem; }

/* Ajustar tipografía de la cola para contrastar con fondo claro */
.called-entry { color: #1a1a1a; }
.queue-item { background: #ffffff; border: 1px solid #d0d7e0; }
```

- [ ] **Step 3: Verificar visualmente**

```bash
npm start
```

Abrir `http://localhost:4200/display/lab-demo/1` → ver split 70/30 + fondo claro.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/display/display.component.*
git commit -m "feat(turnos): TV display layout 70/30 with mockup ad panel and light theme"
```

---

## Task 10: TV display — audio overlay para desbloquear sonido

**Files:**
- Modify: `src/app/features/turnos/pages/display/display.component.{ts,html,scss}`
- Add: `src/assets/beep.mp3` (si no existe)

- [ ] **Step 1: Verificar si existe beep.mp3**

```bash
ls src/assets/ | grep -i beep
```

Si no existe, agregar un beep de ~1s con licencia abierta (freesound.org, CC0). El audio queda en `src/assets/beep.mp3`.

- [ ] **Step 2: Signal `audioUnlocked` con persistencia en sessionStorage**

```ts
// display.component.ts
protected readonly audioUnlocked = signal<boolean>(
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tv-audio-unlocked') === '1'
);

unlockAudio() {
  const a = new Audio('/assets/beep.mp3');
  a.volume = 0;
  a.play().then(() => {
    this.audioUnlocked.set(true);
    sessionStorage.setItem('tv-audio-unlocked', '1');
  }).catch(err => {
    console.warn('[display] audio unlock failed', err);
  });
}

// El play del beep existente se mantiene como está — pero ahora va a funcionar
// porque sessionStorage flag confirma que el user clickeó previamente.
```

- [ ] **Step 3: Overlay condicional en template**

```html
<div class="display-page">
  @if (!audioUnlocked()) {
    <div class="audio-overlay" (click)="unlockAudio()">
      <div class="audio-overlay-content">
        <i class="pi pi-volume-up" style="font-size: 4rem;"></i>
        <h2>Click para activar sonido</h2>
        <p>Hacé click en cualquier parte de la pantalla para habilitar las notificaciones sonoras.</p>
      </div>
    </div>
  }

  <main class="cola-section">...</main>
  <aside class="ad-section">...</aside>
</div>
```

- [ ] **Step 4: Estilos del overlay**

```scss
.audio-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.audio-overlay-content {
  text-align: center;
  max-width: 32rem;
  padding: 2rem;
}

.audio-overlay-content h2 { margin: 1rem 0; font-size: 2rem; }
.audio-overlay-content p { font-size: 1.25rem; color: #d0d0d0; }
```

- [ ] **Step 5: Verificar manualmente**

1. Limpiar sessionStorage del browser.
2. Abrir display → overlay aparece.
3. Click → overlay desaparece + `sessionStorage['tv-audio-unlocked'] === '1'`.
4. Reload mismo tab → overlay NO aparece (porque sessionStorage persiste).
5. `curl POST /api/v1/turnos/queue/{id}/call` → la TV beepa.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/turnos/pages/display/display.component.* src/assets/beep.mp3
git commit -m "feat(turnos): TV display unlock overlay for browser autoplay policy"
```

---

# FASE 4 — Tótem numpad on-screen

## Task 11: TotemNumpadComponent — TDD

**Files:**
- Create: `src/app/features/turnos/pages/totem/components/totem-numpad.component.{ts,html,scss}`
- Test: `src/app/features/turnos/pages/totem/components/totem-numpad.component.spec.ts`

- [ ] **Step 1: Test que falla — clicks en dígitos emiten evento**

```ts
// totem-numpad.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { TotemNumpadComponent } from './totem-numpad.component';

describe('TotemNumpadComponent', () => {
  let fixture: any;
  let component: TotemNumpadComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TotemNumpadComponent] });
    fixture = TestBed.createComponent(TotemNumpadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits digitPressed when a number button is clicked', () => {
    let emitted: number | null = null;
    component.digitPressed.subscribe((d: number) => emitted = d);

    const button5 = fixture.nativeElement.querySelector('[data-digit="5"]');
    button5.click();

    expect(emitted).toBe(5);
  });

  it('emits clearPressed when clear button is clicked', () => {
    let cleared = false;
    component.clearPressed.subscribe(() => cleared = true);
    fixture.nativeElement.querySelector('[data-action="clear"]').click();
    expect(cleared).toBe(true);
  });

  it('emits submitPressed when submit button is clicked', () => {
    let submitted = false;
    component.submitPressed.subscribe(() => submitted = true);
    fixture.nativeElement.querySelector('[data-action="submit"]').click();
    expect(submitted).toBe(true);
  });

  it('disables submit when submitDisabled input is true', () => {
    fixture.componentRef.setInput('submitDisabled', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-action="submit"]');
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests** → todos fallan (component no existe).

```bash
npx vitest run totem-numpad.component.spec
```

- [ ] **Step 3: Implementar el component**

```ts
// totem-numpad.component.ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-totem-numpad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './totem-numpad.component.html',
  styleUrl: './totem-numpad.component.scss',
})
export class TotemNumpadComponent {
  @Input() submitDisabled = false;
  @Output() digitPressed = new EventEmitter<number>();
  @Output() clearPressed = new EventEmitter<void>();
  @Output() submitPressed = new EventEmitter<void>();

  protected readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  pressDigit(d: number) { this.digitPressed.emit(d); }
  press0() { this.digitPressed.emit(0); }
  pressClear() { this.clearPressed.emit(); }
  pressSubmit() { if (!this.submitDisabled) this.submitPressed.emit(); }
}
```

- [ ] **Step 4: Template**

```html
<!-- totem-numpad.component.html -->
<div class="numpad">
  @for (d of digits; track d) {
    <button class="num-btn" type="button" [attr.data-digit]="d" (click)="pressDigit(d)">{{ d }}</button>
  }
  <button class="action-btn clear" type="button" data-action="clear" (click)="pressClear()" aria-label="Borrar">
    <i class="pi pi-backspace"></i>
  </button>
  <button class="num-btn" type="button" data-digit="0" (click)="press0()">0</button>
  <button class="action-btn submit" type="button" data-action="submit" (click)="pressSubmit()" [disabled]="submitDisabled" aria-label="Enviar">
    <i class="pi pi-arrow-right"></i>
  </button>
</div>
```

- [ ] **Step 5: Estilos touch-friendly**

```scss
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
  background: var(--surface-card);
  border: 2px solid var(--surface-border);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.05s, background 0.15s;
}

.num-btn:active, .action-btn:active {
  transform: scale(0.97);
  background: var(--surface-hover);
}

.action-btn.submit {
  background: var(--primary-color);
  color: var(--primary-color-text);
  border-color: var(--primary-color);
}

.action-btn.submit:disabled {
  background: var(--surface-200);
  color: var(--surface-400);
  cursor: not-allowed;
}

.action-btn.clear {
  background: var(--surface-200);
}
```

- [ ] **Step 6: Run tests** → todos pasan.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/turnos/pages/totem/components/totem-numpad.component.*
git commit -m "feat(turnos): totem numpad component with touch-friendly buttons"
```

---

## Task 12: Cablear numpad al `TotemInputDniComponent`

**Files:**
- Modify: `src/app/features/turnos/pages/totem/components/totem-input-dni.component.{ts,html,scss}`

- [ ] **Step 1: Reemplazar `<input>` por display readonly + numpad**

```ts
import { TotemNumpadComponent } from './totem-numpad.component';

@Component({
  selector: 'app-totem-input-dni',
  // ...
  imports: [TotemNumpadComponent /* + existentes */],
  templateUrl: './totem-input-dni.component.html',
  styleUrl: './totem-input-dni.component.scss',
})
export class TotemInputDniComponent {
  protected readonly dni = signal('');

  appendDigit(d: number) {
    if (this.dni().length >= 8) return;
    this.dni.update(v => v + d);
  }

  clear() {
    this.dni.update(v => v.slice(0, -1));
  }

  submit() {
    const value = this.dni();
    if (value.length < 7) return;
    // dispatch al store
    this.store.dispatch(submitTotemEntry({ dni: value }));
  }

  protected readonly submitDisabled = computed(() => this.dni().length < 7);
}
```

- [ ] **Step 2: Template**

```html
<div class="totem-input-dni">
  <h1>Ingresá tu DNI</h1>

  <div class="dni-display">
    {{ dni() || '—' }}
  </div>

  <app-totem-numpad
    [submitDisabled]="submitDisabled()"
    (digitPressed)="appendDigit($event)"
    (clearPressed)="clear()"
    (submitPressed)="submit()" />
</div>
```

- [ ] **Step 3: Estilos del display**

```scss
.totem-input-dni {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem 1rem;
}

.totem-input-dni h1 { font-size: 2.5rem; margin: 0; text-align: center; }

.dni-display {
  font-size: 3.5rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5rem;
  background: var(--surface-card);
  border: 2px solid var(--surface-border);
  border-radius: 12px;
  padding: 1rem 2rem;
  min-width: 20rem;
  text-align: center;
  min-height: 5rem;
}
```

- [ ] **Step 4: Smoke manual**

```bash
npm start
```

Navegar a `/turnos/totem` → ver numpad → tocar dígitos → ver display → submit → flow funciona como antes (dispatch al store).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/turnos/pages/totem/components/totem-input-dni.component.*
git commit -m "feat(turnos): totem input DNI uses on-screen numpad instead of native input"
```

---

# FASE 5 — Smoke + push

## Task 13: Smoke completo + push

- [ ] **Step 1: Run dev server**

```bash
npm start
```

- [ ] **Step 2: Smoke según §11.2 del spec**

1. Login admin → ver sidebar item "Configuración de agendas" → click → llega a `/turnos/configuracion`.
2. "Nueva agenda" → 4 steps → guardar → aparece en lista.
3. Crear agenda overlapping (con horario ya tomado) → toast en español "se superpone" → no crashea.
4. Abrir `/display/lab-demo/1` en otra pestaña → ver layout 70/30 + fondo claro + mockup publicidad.
5. Sin click previo: overlay "Click para activar sonido" → click → desaparece.
6. `curl POST /api/v1/turnos/queue/{id}/call` → TV beepa.
7. `/turnos/totem` → numpad visible → tipear DNI tocando botones → submit funciona.

- [ ] **Step 3: Fix bugs encontrados inline o anotar como TODO**

- [ ] **Step 4: Run tests + tsc**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 5: Push + PR**

```bash
git push -u origin feat/turnos-ux-lab
gh pr create --title "feat(turnos): UX pendientes — wizard, sidebar, TV layout, tótem numpad" --body "..."
```

PR body: link al spec + checklist del smoke + screenshots.

---

## Estado final esperado

- 13 tasks completadas.
- Branch `feat/turnos-ux-lab` con ~15-20 commits.
- PR abierto.
- Develop sin tocar.
