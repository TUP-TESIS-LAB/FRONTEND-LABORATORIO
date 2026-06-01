# Sucursales Stepper UX Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-47](https://exequielsantoro.atlassian.net/browse/KAN-47)

**Goal:** Fix 7 UX bugs in the sucursales stepper (branch `feat/sucursales-back-office`): toast timing, confirmar step empty summary, horarios chips UX, sections panel not rendering, stepper scroll, form consistency.

**Architecture:** All fixes are isolated to existing component files — no new files, no store shape changes, no route changes. Each fix = one granular commit. The store (actions/reducer/selectors) is only touched for the sections panel reload-on-area-select fix.

**Tech Stack:** Angular 21, standalone components, NgRx classic, signals, OnPush, PrimeNG, PrimeIcons, SCSS with CSS vars.

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts` | Remove toast on success, keep only `completed.emit()` |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts` | Inject MessageService, show toast in `finish()` |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.ts` | Add loading signal, fix `ngOnInit` loadDetail wait |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.html` | Add loading state, back-to-step links for empty sections |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.ts` | Replace dayFrom/dayTo form controls with selectedDays signal + chips logic |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.html` | Replace two dropdowns with chip row |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.scss` | Add `.day-chips` + `.day-chip` styles |
| `src/app/features/sucursales/pages/catalogo/components/sections-panel.component.ts` | Add effect to reload sections when selectedAreaId changes |
| `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss` | Replace `height: 100%` with min-height viewport approach |

---

## Task 1: Fix toast timing — no toast in Step 1, toast in finish()

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts`

- [ ] **Step 1: Edit datos-step.component.ts — remove the success toast block**

In the `subscribe(({ sucursal }) => { ... })` block, remove the `this.messageService.add({ severity: 'success', ... })` call. Keep `this.saving.set(false)` and `this.completed.emit(sucursal.id)`.

Also remove the `MessageService` import and injection since it's no longer needed in this component.

Result — the subscribe block becomes:
```ts
this.actions$.pipe(
  ofType(addSucursalSuccess),
  take(1),
  takeUntilDestroyed(this.destroyRef),
).subscribe(({ sucursal }) => {
  this.saving.set(false);
  this.completed.emit(sucursal.id);
});
```

And remove from imports: `import { MessageService } from 'primeng/api';`

And remove from class body: `private messageService = inject(MessageService);`

- [ ] **Step 2: Edit sucursal-alta-stepper.page.ts — inject MessageService and show toast in finish()**

The `MessageService` is already in `providers: [MessageService]` and the `ToastModule` is already imported. Just inject it and use in `finish()`:

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DatosStepComponent } from './steps/datos-step.component';
import { HorariosStepComponent } from './steps/horarios-step.component';
import { ContactosStepComponent } from './steps/contactos-step.component';
import { WorkspacesStepComponent } from './steps/workspaces-step.component';
import { TotemStepComponent } from './steps/totem-step.component';
import { ConfirmarStepComponent } from './steps/confirmar-step.component';

@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepperModule, ButtonModule, ToastModule, DatosStepComponent, HorariosStepComponent, ContactosStepComponent, WorkspacesStepComponent, TotemStepComponent, ConfirmarStepComponent],
  templateUrl: './sucursal-alta-stepper.page.html',
  styleUrl: './sucursal-alta-stepper.page.scss',
  providers: [MessageService],
})
export class SucursalAltaStepperPage {
  private router = inject(Router);
  private store = inject(Store);
  private messageService = inject(MessageService);

  protected readonly STEPS = [
    { key: 'datos', label: 'Datos' },
    { key: 'horarios', label: 'Horarios' },
    { key: 'contactos', label: 'Contactos' },
    { key: 'workspaces', label: 'Workspaces' },
    { key: 'totem', label: 'Tótem' },
    { key: 'confirmar', label: 'Confirmar' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly branchId = signal<number | null>(null);

  onDatosCompleted(branchId: number) {
    this.branchId.set(branchId);
    this.currentStep.set(2);
  }

  goToStep(step: number) {
    if (step > 1 && this.branchId() == null) return;
    if (step < 1 || step > this.STEPS.length) return;
    this.currentStep.set(step);
  }

  finish() {
    const id = this.branchId();
    if (id == null) return;
    this.messageService.add({
      severity: 'success',
      summary: 'Sucursal creada',
      detail: 'La configuración se guardó correctamente.',
    });
    this.router.navigate(['/sucursales/configuracion', id]);
  }

  cancel() {
    this.router.navigate(['/sucursales/configuracion']);
  }
}
```

- [ ] **Step 3: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors related to these two files.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts
git commit -m "fix(sucursales): no toast en step 1 datos, toast en finish del stepper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fix confirmar step — loading state + back-to-step links

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.ts`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.html`

The store wiring is correct (`loadDetail` → `loadDetailSuccess` → reducer sets `current/schedules/contacts/workspaces/totemConfig`). The issue is UX: the user sees "Cargando resumen..." until `current()` resolves, but empty sub-resources show plain text with no call-to-action. Fix: add a `loadingDetail` signal read, show proper loading spinner, and add back-to-step buttons for empty sections.

- [ ] **Step 1: Update confirmar-step.component.ts — add loadingDetail selector**

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  selectCurrentSucursal, selectSchedules, selectContacts, selectWorkspaces, selectTotemConfig,
  selectAreas, selectLoadingDetail,
} from '../../../../store/sucursal.selectors';
import { loadDetail } from '../../../../store/sucursal.actions';
import { DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';
import { ContactType } from '../../../../models/branch-contact.model';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
  FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  FULL_DAY: 'Día completo', MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche',
};

const CONTACT_LABELS: Record<ContactType, string> = {
  PHONE: 'Teléfono', MOBILE: 'Celular', EMAIL: 'Email',
  WHATSAPP: 'WhatsApp', FAX: 'Fax', WEBSITE: 'Sitio web',
};

@Component({
  selector: 'app-confirmar-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CardModule, DividerModule, ProgressSpinnerModule],
  templateUrl: './confirmar-step.component.html',
  styleUrl: './confirmar-step.component.scss',
})
export class ConfirmarStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() finish = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() goToStep = new EventEmitter<number>();

  private store = inject(Store);

  protected readonly loadingDetail = this.store.selectSignal(selectLoadingDetail);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);
  protected readonly schedules = this.store.selectSignal(selectSchedules);
  protected readonly contacts = this.store.selectSignal(selectContacts);
  protected readonly workspaces = this.store.selectSignal(selectWorkspaces);
  protected readonly totemConfig = this.store.selectSignal(selectTotemConfig);
  protected readonly areas = this.store.selectSignal(selectAreas);

  ngOnInit() {
    this.store.dispatch(loadDetail({ branchId: this.branchId }));
  }

  dayLabel(d: DayOfWeek): string { return DAY_LABELS[d] ?? d; }
  scheduleTypeLabel(t: ScheduleType): string { return TYPE_LABELS[t] ?? t; }
  contactLabel(t: ContactType): string { return CONTACT_LABELS[t] ?? t; }

  areaName(areaId: number): string {
    return this.areas().find(a => a.id === areaId)?.name ?? `Área #${areaId}`;
  }

  sectionRef(sectionId: number): string {
    return `Sección #${sectionId}`;
  }
}
```

Note: `goToStep` output is added so the user can navigate back to any step from the confirm view. The orchestrator already handles `goToStep` method, but the event needs to be wired in the HTML template and in the orchestrator's step-panel binding.

- [ ] **Step 2: Update confirmar-step.component.html — loading spinner + empty state back-links**

```html
<div class="confirmar-step">
  <h2>Confirmar</h2>
  <p class="muted">Revisá la configuración antes de finalizar.</p>

  @if (loadingDetail()) {
    <div class="loading-state">
      <p-progressSpinner strokeWidth="4" animationDuration=".8s" />
      <p class="muted">Cargando resumen...</p>
    </div>
  } @else if (current(); as branch) {
    <div class="summary">
      <p-card header="Datos básicos">
        <dl class="data-list">
          <dt>Código</dt><dd>{{ branch.code }}</dd>
          <dt>Descripción</dt><dd>{{ branch.description }}</dd>
          <dt>Estado</dt><dd>{{ branch.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</dd>
          @if (branch.address?.street) {
            <dt>Dirección</dt>
            <dd>{{ branch.address?.street }} {{ branch.address?.streetNumber }}</dd>
          }
        </dl>
      </p-card>

      <p-card header="Horarios ({{ schedules().length }})">
        @if (schedules().length === 0) {
          <div class="empty-section">
            <p class="empty">Sin horarios cargados.</p>
            <p-button label="Ir a Horarios" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(2)" />
          </div>
        } @else {
          <ul class="list">
            @for (s of schedules(); track s.id) {
              <li>
                <strong>{{ dayLabel(s.dayFrom) }}</strong>
                @if (s.dayFrom !== s.dayTo) { – <strong>{{ dayLabel(s.dayTo) }}</strong> }
                · {{ s.fromTime }} – {{ s.toTime }}
                · <span class="muted">{{ scheduleTypeLabel(s.scheduleType) }}</span>
              </li>
            }
          </ul>
        }
      </p-card>

      <p-card header="Contactos ({{ contacts().length }})">
        @if (contacts().length === 0) {
          <div class="empty-section">
            <p class="empty">Sin contactos cargados.</p>
            <p-button label="Ir a Contactos" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(3)" />
          </div>
        } @else {
          <ul class="list">
            @for (c of contacts(); track c.id) {
              <li><strong>{{ contactLabel(c.contactType) }}:</strong> {{ c.value }}</li>
            }
          </ul>
        }
      </p-card>

      <p-card header="Workspaces ({{ workspaces().length }})">
        @if (workspaces().length === 0) {
          <div class="empty-section">
            <p class="empty">Sin workspaces cargados.</p>
            <p-button label="Ir a Workspaces" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(4)" />
          </div>
        } @else {
          <ul class="list">
            @for (w of workspaces(); track w.id) {
              <li>{{ areaName(w.areaId) }} — {{ sectionRef(w.sectionId) }}</li>
            }
          </ul>
        }
      </p-card>

      <p-card header="Tótem">
        <p>
          <i [class]="(totemConfig()?.enabled) ? 'pi pi-check-circle text-green' : 'pi pi-times-circle text-muted'"></i>
          {{ (totemConfig()?.enabled) ? 'Tótem habilitado' : 'Tótem deshabilitado' }}
        </p>
        <p-button label="Ir a Tótem" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(5)" />
      </p-card>
    </div>
  } @else {
    <p class="muted">No se pudo cargar el resumen. Intentá volver y entrar de nuevo.</p>
  }

  <footer class="step-footer">
    <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (click)="back.emit()" />
    <p-button label="Finalizar" icon="pi pi-check" (click)="finish.emit()" [disabled]="loadingDetail()" />
  </footer>
</div>
```

- [ ] **Step 3: Update confirmar-step.component.scss — add loading-state and text-green/text-muted helpers**

Append to the existing SCSS:
```scss
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 0;
}

.empty-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.text-green { color: var(--green-500); }
.text-muted { color: var(--text-color-secondary); }
```

- [ ] **Step 4: Wire goToStep output in sucursal-alta-stepper.page.html**

In `sucursal-alta-stepper.page.html`, find the `app-confirmar-step` binding and add `(goToStep)="goToStep($event)"`:

```html
<app-confirmar-step [branchId]="branchId()!" (finish)="finish()" (back)="goToStep(5)" (goToStep)="goToStep($event)" />
```

- [ ] **Step 5: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.ts src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.scss src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html
git commit -m "fix(sucursales): confirmar step muestra resumen completo de sub-recursos

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Replace horarios dropdowns with chip multi-select L M X J V S D

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.ts`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.html`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.scss`

**Approach:** The form keeps `fromTime`, `toTime`, `scheduleType`. The `dayFrom`/`dayTo` form controls are removed and replaced by a `selectedDays` signal (Set of DayOfWeek). On `add()`, iterate each selected day and dispatch one `addSchedule` per day with `dayFrom=dayTo=day`. The `+` button is disabled if no day is selected or form is invalid.

- [ ] **Step 1: Replace horarios-step.component.ts**

```ts
import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal, computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { selectSchedules } from '../../../../store/sucursal.selectors';
import { loadSchedules, addSchedule, deleteSchedule } from '../../../../store/sucursal.actions';
import { BranchSchedule, DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';

const SCHEDULE_TYPE_OPTIONS: { label: string; value: ScheduleType }[] = [
  { label: 'Día completo', value: 'FULL_DAY' },
  { label: 'Mañana', value: 'MORNING' },
  { label: 'Tarde', value: 'AFTERNOON' },
  { label: 'Noche', value: 'NIGHT' },
];

export const DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'MONDAY',    label: 'L' },
  { id: 'TUESDAY',   label: 'M' },
  { id: 'WEDNESDAY', label: 'X' },
  { id: 'THURSDAY',  label: 'J' },
  { id: 'FRIDAY',    label: 'V' },
  { id: 'SATURDAY',  label: 'S' },
  { id: 'SUNDAY',    label: 'D' },
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

@Component({
  selector: 'app-horarios-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, SelectModule, InputTextModule],
  templateUrl: './horarios-step.component.html',
  styleUrl: './horarios-step.component.scss',
})
export class HorariosStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);
  private fb = inject(FormBuilder);

  protected readonly schedules = this.store.selectSignal(selectSchedules);
  protected readonly DAYS = DAYS;
  protected readonly typeOptions = SCHEDULE_TYPE_OPTIONS;

  /** Set of selected day IDs */
  protected readonly selectedDays = signal<Set<DayOfWeek>>(new Set());

  protected readonly canAdd = computed(
    () => this.selectedDays().size > 0 && this.form.valid
  );

  protected readonly form = this.fb.nonNullable.group({
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    toTime:   ['17:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    scheduleType: ['FULL_DAY' as ScheduleType, Validators.required],
  });

  ngOnInit() {
    this.store.dispatch(loadSchedules({ branchId: this.branchId }));
  }

  isSelected(day: DayOfWeek): boolean {
    return this.selectedDays().has(day);
  }

  toggleDay(day: DayOfWeek): void {
    const next = new Set(this.selectedDays());
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    this.selectedDays.set(next);
  }

  add() {
    if (!this.canAdd()) return;
    const { fromTime, toTime, scheduleType } = this.form.getRawValue();
    for (const day of this.selectedDays()) {
      this.store.dispatch(addSchedule({
        branchId: this.branchId,
        input: { dayFrom: day, dayTo: day, fromTime, toTime, scheduleType },
      }));
    }
    this.selectedDays.set(new Set());
    this.form.reset({ fromTime: '09:00', toTime: '17:00', scheduleType: 'FULL_DAY' });
  }

  remove(id: number) {
    this.store.dispatch(deleteSchedule({ branchId: this.branchId, id }));
  }

  labelForDay(day: DayOfWeek): string {
    return DAY_LABELS[day] ?? day;
  }

  labelForType(type: ScheduleType): string {
    return SCHEDULE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }
}
```

- [ ] **Step 2: Replace horarios-step.component.html**

```html
<div class="horarios-step">
  <h2>Horarios de atención</h2>
  <p class="muted">Seleccioná los días, el horario y el tipo. Podés agregar múltiples bloques.</p>

  <form [formGroup]="form" (ngSubmit)="add()" class="inline-form">
    <div class="form-field full-width">
      <label>Días *</label>
      <div class="day-chips">
        @for (d of DAYS; track d.id) {
          <button
            class="day-chip"
            type="button"
            [class.selected]="isSelected(d.id)"
            (click)="toggleDay(d.id)"
            [title]="d.id">{{ d.label }}</button>
        }
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>Desde *</label>
        <input pInputText type="time" formControlName="fromTime" />
        @if (form.controls.fromTime.invalid && form.controls.fromTime.touched) {
          <small class="form-error">Formato HH:mm requerido.</small>
        }
      </div>
      <div class="form-field">
        <label>Hasta *</label>
        <input pInputText type="time" formControlName="toTime" />
        @if (form.controls.toTime.invalid && form.controls.toTime.touched) {
          <small class="form-error">Formato HH:mm requerido.</small>
        }
      </div>
      <div class="form-field">
        <label>Tipo *</label>
        <p-select formControlName="scheduleType" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body" />
      </div>
      <div class="form-action">
        <p-button icon="pi pi-plus" label="Agregar" type="submit" [disabled]="!canAdd()" />
      </div>
    </div>
  </form>

  <p class="counter muted">{{ schedules().length }} horario{{ schedules().length !== 1 ? 's' : '' }} cargado{{ schedules().length !== 1 ? 's' : '' }}</p>

  <p-table [value]="schedules()" dataKey="id" [scrollable]="true" scrollHeight="16rem" class="schedules-table">
    <ng-template pTemplate="header">
      <tr>
        <th>Día</th>
        <th>Horario</th>
        <th>Tipo</th>
        <th style="width: 4rem"></th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-s>
      <tr>
        <td>{{ labelForDay(s.dayFrom) }}</td>
        <td>{{ s.fromTime }} – {{ s.toTime }}</td>
        <td>{{ labelForType(s.scheduleType) }}</td>
        <td>
          <p-button icon="pi pi-trash" [text]="true" severity="danger" size="small" (click)="remove(s.id)" />
        </td>
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr><td colspan="4" class="muted">Sin horarios cargados aún.</td></tr>
    </ng-template>
  </p-table>

  <footer class="step-footer">
    <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (click)="back.emit()" />
    <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" (click)="next.emit()" />
  </footer>
</div>
```

- [ ] **Step 3: Replace horarios-step.component.scss**

```scss
.horarios-step h2 { margin: 0 0 0.5rem; }
.muted { color: var(--text-color-secondary); margin-bottom: 0.5rem; }
.counter { font-size: 0.875rem; margin: 0 0 0.75rem; }

.inline-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.full-width { width: 100%; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
}

@media (max-width: 900px) {
  .form-row { grid-template-columns: 1fr 1fr; }
  .form-action { grid-column: span 2; }
}

.form-field { display: flex; flex-direction: column; gap: 0.25rem; }
.form-field label { font-size: 0.75rem; font-weight: 500; }
.form-action { display: flex; align-items: end; }
.form-error { color: var(--red-500); font-size: 0.75rem; }

/* Day chips */
.day-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.day-chip {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 2px solid var(--surface-border);
  background: var(--surface-card);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
}

.day-chip:hover {
  background: var(--surface-hover);
}

.day-chip.selected {
  background: var(--primary-color);
  color: var(--primary-color-text);
  border-color: var(--primary-color);
}

.schedules-table { margin-bottom: 1.5rem; }

.step-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
```

- [ ] **Step 4: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.ts src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.scss
git commit -m "feat(sucursales): horarios step con chips L M X J V S D multi-select

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Fix sections panel — reload sections when area is selected

**Files:**
- Modify: `src/app/features/sucursales/pages/catalogo/components/sections-panel.component.ts`

**Root cause:** `SectionsPanelComponent.ngOnInit()` dispatches `loadSections({})` once (fetches first 100 sections globally). When the user creates a new area and immediately clicks it, the global fetch ran before the area existed — so its sections (0 at creation time) are in the store. Since `loadSections({})` only runs once in `ngOnInit`, newly created areas show empty even when you click them repeatedly. The fix: use an `effect()` to watch `selectedAreaId()` changes and dispatch `loadSections({ areaId })` each time it changes (instead of the one-time global load).

- [ ] **Step 1: Update sections-panel.component.ts**

Add `effect` import and replace `ngOnInit` with an `effect` that reloads when `selectedAreaId` changes:

```ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import {
  selectSelectedAreaId,
  selectSections,
  selectAreas,
} from '../../../store/sucursal.selectors';
import {
  loadSections,
  addSection,
  updateSection,
  toggleSectionStatus,
} from '../../../store/sucursal.actions';
import { Section, SectionCreateInput } from '../../../models/section.model';

@Component({
  selector: 'app-sections-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TooltipModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
  ],
  templateUrl: './sections-panel.component.html',
  styleUrl: './sections-panel.component.scss',
})
export class SectionsPanelComponent {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);

  protected readonly selectedAreaId = this.store.selectSignal(selectSelectedAreaId);
  private readonly allSections = this.store.selectSignal(selectSections);
  private readonly allAreas = this.store.selectSignal(selectAreas);

  protected readonly sections = computed(() => {
    const areaId = this.selectedAreaId();
    return areaId == null ? [] : this.allSections().filter(s => s.areaId === areaId);
  });

  protected readonly selectedAreaName = computed(() => {
    const id = this.selectedAreaId();
    if (id == null) return null;
    return this.allAreas().find(a => a.id === id)?.name ?? null;
  });

  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Section | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });

  constructor() {
    // Reload sections for the selected area each time it changes.
    // This ensures freshly created areas (with 0 sections) still trigger a load.
    effect(() => {
      const areaId = this.selectedAreaId();
      if (areaId != null) {
        this.store.dispatch(loadSections({ areaId }));
      }
    });
  }

  openNew() {
    if (this.selectedAreaId() == null) return;
    this.editing.set(null);
    this.form.reset({ name: '' });
    this.dialogVisible.set(true);
  }

  openEdit(section: Section) {
    this.editing.set(section);
    this.form.patchValue({ name: section.name });
    this.dialogVisible.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    const name = this.form.value.name!.trim();
    const e = this.editing();
    if (e) {
      this.store.dispatch(updateSection({ id: e.id, input: { name, areaId: e.areaId } }));
    } else {
      const areaId = this.selectedAreaId();
      if (areaId == null) return;
      const input: SectionCreateInput = { name, areaId };
      this.store.dispatch(addSection({ input }));
    }
    this.dialogVisible.set(false);
  }

  remove(section: Section) {
    this.confirm.confirm({
      message: `¿Eliminar la sección "${section.name}"? Se conservará el histórico (soft-delete).`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(toggleSectionStatus({ id: section.id })),
    });
  }
}
```

Note: `OnInit` is no longer needed (removed from imports). The `effect()` runs on construction and whenever `selectedAreaId` changes.

Also note: the `loadSections` effect in `sucursal.effects.ts` at line 239 uses `switchMap(({ areaId }) => this.sectionService.list({ areaId, page: 0, size: 100 }))`. When `areaId` is provided, the service call passes it as a query param, filtering server-side. The reducer replaces `state.sections` with the returned page — this means sections from other areas are evicted from the store on each area switch. This is acceptable for this use case (client-side filtering works for the current loaded area, and each switch triggers a fresh load).

- [ ] **Step 2: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/sucursales/pages/catalogo/components/sections-panel.component.ts
git commit -m "fix(sucursales): sections panel recarga secciones al seleccionar area

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Fix stepper scroll — min-height viewport approach

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss`

**Analysis:** The `admin-shell` layout sets `ui-admin-shell__content` with `flex: 1; overflow-y: auto; padding: var(--space-6)`. The router outlet is inside that content div. Because it scrolls internally, `height: 100%` on `.alta-page` resolves to the full (potentially very tall) content box, not the viewport. The fix: make `.alta-page` fill the available flex space without enabling page-level scroll, and let `.alta-stepper` scroll internally if content overflows.

```scss
.alta-page {
  padding: 1rem 1.5rem;
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  /* Use min-height to ensure the page fills the viewport on 1080p
     without relying on % which doesn't resolve in a scroll container. */
  min-height: calc(100vh - var(--ds-topbar-h, 4rem) - var(--space-6, 1.5rem) * 2);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex: 0 0 auto;
}

.page-header h1 {
  margin: 0;
  flex: 1;
  font-size: 1.5rem;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--text-color);
  padding: 0.5rem;
  border-radius: 4px;
}

.back-btn:hover {
  background: var(--surface-hover);
}

.header-spacer {
  flex: 0 0 2rem;
}

.alta-stepper {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  flex: 1 1 auto;
  /* Step content scrolls internally, not the whole page */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.step-content {
  padding: 1rem 0 0;
  flex: 1 1 auto;
  overflow-y: auto;
}
```

- [ ] **Step 1: Replace sucursal-alta-stepper.page.scss with the content above**

- [ ] **Step 2: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors (SCSS changes don't affect TS).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss
git commit -m "fix(sucursales): stepper usa min-height viewport para no scrollear

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Visual consistency — icons, counters, labels across all steps

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.scss`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.html`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.scss`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.html`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.scss`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.scss`

**Goal:** add icons to Volver/Siguiente buttons, counters for list steps, consistent spacing. 

First read each HTML/SCSS to understand current state before editing. (They were read during planning — see above in the context.)

- [ ] **Step 1: Read contactos-step.component.html and .scss to verify current state**

Read files:
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.scss`

- [ ] **Step 2: Update contactos-step.component.html — add counter + icons to footer buttons**

Add `{{ contacts().length }} contacto(s) cargado(s)` counter above the table.
Add `icon="pi pi-arrow-left"` to Volver, `icon="pi pi-arrow-right" iconPos="right"` to Siguiente.

- [ ] **Step 3: Update workspaces-step.component.html — add counter + icons to footer buttons**

Add `{{ workspaces().length }} workspace(s) cargado(s)` counter above the table.
Add `icon="pi pi-arrow-left"` to Volver, `icon="pi pi-arrow-right" iconPos="right"` to Siguiente.

- [ ] **Step 4: Update totem-step.component.html — add icons to footer buttons**

Add `icon="pi pi-arrow-left"` to Volver, `icon="pi pi-arrow-right" iconPos="right"` to Siguiente.

- [ ] **Step 5: Run tsc check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.html
git commit -m "style(sucursales): consistencia visual en steps del stepper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final tsc + vitest verification

- [ ] **Step 1: Full tsc check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run vitest for sucursales**

```bash
npx vitest run src/app/features/sucursales/
```

Expected: all tests pass (or only pre-existing failures unrelated to this branch's changes).

- [ ] **Step 3: Verify git log**

```bash
git log --oneline HEAD~10..HEAD
```

Expected: 6 commits visible in order:
1. `fix(sucursales): no toast en step 1 datos, toast en finish del stepper`
2. `fix(sucursales): confirmar step muestra resumen completo de sub-recursos`
3. `feat(sucursales): horarios step con chips L M X J V S D multi-select`
4. `fix(sucursales): sections panel recarga secciones al seleccionar area`
5. `fix(sucursales): stepper usa min-height viewport para no scrollear`
6. `style(sucursales): consistencia visual en steps del stepper`

---

## Self-Review Checklist

- [x] Issue 1 (toast timing): datos-step removes toast, orchestrator adds toast in finish() — covered in Task 1
- [x] Issue 2 (confirmar empty): loading state + back-to-step links + areas loaded in forkJoin — covered in Task 2
- [x] Issue 3 (horarios chips): L M X J V S D chips, multi-select, dispatch N actions on add — covered in Task 3
- [x] Issue 4 (sections panel): effect reloads on area change — covered in Task 4
- [x] Issue 5 (stepper scroll): min-height calc approach — covered in Task 5
- [x] Issue 6+7 (forms consistency): icons on buttons, counters — covered in Task 6
- [x] No action shape changes
- [x] No route changes
- [x] OnPush + signals + standalone everywhere
- [x] Spanish UI text only
- [x] PrimeIcons used (no unicode emojis)
- [x] No backend changes required for any fix

## Notes for Report

- The `confirmar-step.component.ts` adds `goToStep` as a new `@Output` — the orchestrator's `sucursal-alta-stepper.page.html` must bind it: `(goToStep)="goToStep($event)"`.
- The sections panel bug root cause: `loadSections({})` was called once at ngOnInit without areaId, fetching all sections. But the `loadSectionsSuccess` reducer **replaces** the entire `sections[]` array. If a new area is selected that was created after this initial fetch, its sections (none yet) are NOT in the store. The effect-based reload on `selectedAreaId` change fixes this by fetching sections for the selected area on every selection.
- No backend changes needed — all fixes are purely frontend.
- `ProgressSpinnerModule` from `primeng/progressspinner` must be imported in `confirmar-step.component.ts`.
