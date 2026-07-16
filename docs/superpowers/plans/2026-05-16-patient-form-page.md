# Patient Form Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the patient create/edit drawer (`<pat-form-drawer>`) with a dedicated page mounted at `/pacientes/nuevo` and `/pacientes/:id/editar`, optimized for daily secretarial use.

**Architecture:** Lift the existing drawer's `FormGroup` + sub-section composition into a new lazy-loaded `PatientFormPage`. The page lives inside the existing `AdminShellComponent` (topbar + sidebar). Two-column grid layout, sticky page header with a back button, sticky form footer with status + Ctrl+S/Esc shortcuts. Wires up post-save redirects via the `Actions` stream (`addPatientSuccess` / `updatePatientSuccess`).

**Tech Stack:** Angular 21 standalone components, Reactive Forms, NgRx classic, PrimeNG (Button, InputText, Select, DatePicker, Tag, ConfirmDialog), Tailwind for layout utilities, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-05-16-patient-form-page-design.md`

---

## File Structure

**Create:**
- `src/app/features/pacientes/pages/patient-form/patient-form.page.ts` — page component (template + form + redirects + guards + shortcuts).
- `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts` — Vitest specs.

**Modify:**
- `src/app/features/pacientes/pacientes.routes.ts` — add `nuevo` and `:id/editar` routes.
- `src/app/features/pacientes/pages/patient-list/patient-list.page.ts` — strip drawer, swap to `routerLink`.
- `src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts` — drop drawer cases.
- `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts` — strip drawer, swap "Editar" to `routerLink`.

**Delete:**
- `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.ts`
- `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.spec.ts`
- (folder `patient-form-drawer/` should be empty after — remove it)

---

## Task 1: Add routes for create/edit pages

**Files:**
- Modify: `src/app/features/pacientes/pacientes.routes.ts`

- [ ] **Step 1: Update the route table**

Replace the entire file contents with:

```ts
import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/patient-list/patient-list.page').then((m) => m.PatientListPage),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/patient-form/patient-form.page').then((m) => m.PatientFormPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
  },
];
```

Order matters: `nuevo` and `:id/editar` must come before the bare `:id` so the literal segments match first.

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build fails with `Cannot find module './pages/patient-form/patient-form.page'` — this is OK, the file lands in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/pacientes.routes.ts
git commit -m "feat(pacientes): add routes for /pacientes/nuevo and /pacientes/:id/editar"
```

---

## Task 2: Scaffold PatientFormPage with header and back button (no form yet)

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Create: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 1: Write a failing render test**

Create `patient-form.page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { PatientFormPage } from './patient-form.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';

describe('PatientFormPage', () => {
  let actions$: ReplaySubject<unknown>;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    TestBed.configureTestingModule({
      imports: [PatientFormPage],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideMockActions(() => actions$),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('renders the create-mode header when there is no id', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const headerText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(headerText).toContain('Volver');
    expect(headerText).toContain('Nuevo paciente');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- patient-form.page.spec`
Expected: FAIL — `Cannot find module './patient-form.page'`.

- [ ] **Step 3: Create the minimal page component**

Create `patient-form.page.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'pat-patient-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar paciente' : 'Nuevo paciente' }}
        </h1>
        <nav class="ml-auto text-xs text-surface-500">
          Pacientes › {{ isEdit() ? 'Editar' : 'Nuevo' }}
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <p>Form placeholder — viene en la próxima task.</p>
      </div>
    </div>
  `,
})
export class PatientFormPage {
  readonly id = input<string | undefined>(undefined);

  private readonly router = inject(Router);

  readonly isEdit = computed(() => this.id() != null && this.id() !== '');

  onBack(): void {
    this.router.navigate(['/pacientes']);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- patient-form.page.spec`
Expected: PASS.

- [ ] **Step 5: Add an edit-mode header test**

Append to the `describe` block in `patient-form.page.spec.ts`:

```ts
  it('renders the edit-mode header when an id is provided', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '42');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Editar paciente');
  });
```

Run: `npm run test -- patient-form.page.spec`
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/
git commit -m "feat(pacientes): scaffold PatientFormPage with back button and dynamic header"
```

---

## Task 3: Port the form (general section + sub-section arrays + submit)

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 1: Write failing tests for hydration and dispatch**

Append to the `describe` block in `patient-form.page.spec.ts`:

```ts
  it('dispatches checkPatientDni when a valid dni is typed in create mode', async () => {
    const { checkPatientDni } = await import('../../store/patient.actions');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.form.get('general.dni')?.setValue('32456789');
    expect(spy).toHaveBeenCalledWith(checkPatientDni({ dni: '32456789' }));
  });

  it('dispatches addPatient on submit in create mode', async () => {
    const { addPatient } = await import('../../store/patient.actions');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      general: {
        firstName: 'Ana', lastName: 'Pérez', dni: '12345678',
        birthDate: new Date('1990-01-01'),
        gender: 'FEMALE', sexAtBirth: 'FEMALE',
      },
    });
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalled();
    const dispatched = spy.mock.calls[0][0] as ReturnType<typeof addPatient>;
    expect(dispatched.type).toBe(addPatient({ req: dispatched.req }).type);
    expect(dispatched.req.firstName).toBe('Ana');
    expect(dispatched.req.dni).toBe('12345678');
  });
```

Also add `MockStore` to the existing import line if not yet there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- patient-form.page.spec`
Expected: FAIL — `form` property undefined.

- [ ] **Step 3: Replace the page with the full form implementation**

Overwrite `patient-form.page.ts` with the full component below. It ports the drawer's form construction, hydration, DNI check, status estimate, and submit. (Reuses the global `.pat-form__*` styles from `src/styles/utilities.scss`.)

```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, updatePatient, checkPatientDni, loadPatient, clearSelectedPatient,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState, selectSelectedPatient,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../../components/contact-section/contact-section.component';
import { AddressSectionComponent } from '../../components/address-section/address-section.component';
import { CoverageSectionComponent } from '../../components/coverage-section/coverage-section.component';

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'NOT_SPECIFIED', label: 'No especificado' },
];
const SEX_OPTS: { value: SexAtBirth; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'INTERSEX', label: 'Intersex' },
];

function isoFromDate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

@Component({
  selector: 'pat-patient-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule,
    TagModule, DatePickerModule,
    ContactSectionComponent, AddressSectionComponent, CoverageSectionComponent,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver"
                  type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar paciente' : 'Nuevo paciente' }}
          @if (isEdit() && patient(); as p) {
            <span class="text-surface-500 font-normal ml-2">· {{ p.lastName }}, {{ p.firstName }}</span>
          }
        </h1>
        <nav class="ml-auto text-xs text-surface-500">
          Pacientes › {{ isEdit() ? 'Editar' : 'Nuevo' }}
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
          @if (saveError(); as err) {
            <div class="lg:col-span-2 pat-form__card"
                 style="background:#fef2f2;border-color:var(--ds-danger);color:var(--ds-danger);">
              {{ saveErrorMessage(err) }}
            </div>
          }

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-user" style="margin-right:6px"></i>Datos generales</span>
              <p-tag [value]="statusEstimate()" severity="info" />
            </div>
            <div class="pat-form__grid" formGroupName="general">
              <div class="pat-form__field">
                <label class="pat-form__label">Apellido*</label>
                <input pInputText formControlName="lastName" class="pat-form__input" placeholder="García" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="firstName" class="pat-form__input" placeholder="María Elena" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">DNI*</label>
                <input pInputText formControlName="dni" class="pat-form__input" placeholder="32456789" />
                @if (dniDuplicate()) {
                  <p class="pat-form__error" role="alert">Ya existe un paciente con ese DNI</p>
                }
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Fecha de nacimiento*</label>
                <p-datepicker formControlName="birthDate" dateFormat="dd/mm/yy" appendTo="body" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Género</label>
                <p-select formControlName="gender" [options]="genderOpts" optionLabel="label"
                          optionValue="value" placeholder="—" appendTo="body" class="w-full" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Sexo registral</label>
                <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label"
                          optionValue="value" placeholder="—" appendTo="body" class="w-full" />
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-id-card" style="margin-right:6px"></i>Coberturas</span>
            </div>
            <pat-coverage-section [array]="coveragesArray" />
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-phone" style="margin-right:6px"></i>Contactos</span>
            </div>
            <pat-contact-section [array]="contactsArray" />
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-map-marker" style="margin-right:6px"></i>Direcciones</span>
            </div>
            <pat-address-section [array]="addressesArray" />
          </section>
        </div>
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">
          {{ formStatusLabel() }}
        </span>
        <span class="text-xs text-surface-400 ml-2">
          <kbd>Ctrl</kbd>+<kbd>S</kbd> para guardar · <kbd>Esc</kbd> para volver
        </span>
        <div class="ml-auto flex gap-2">
          <p-button label="Cancelar" severity="secondary" [outlined]="true"
                    type="button" (onClick)="onBack()" />
          <p-button
            [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
            type="submit"
            [loading]="pending()"
            [disabled]="!canSubmit()" />
        </div>
      </footer>
    </form>
  `,
})
export class PatientFormPage {
  /** Comes from `:id/editar` via withComponentInputBinding(). Undefined in create mode. */
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly saveError = this.store.selectSignal(selectPatientError);
  readonly patient = this.store.selectSignal(selectSelectedPatient);
  private readonly state = this.store.selectSignal(selectPatientState);

  readonly form: FormGroup = this.fb.group({
    general: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
      birthDate: [null, Validators.required],
      gender: [null],
      sexAtBirth: [null],
    }),
    contacts: this.fb.array<FormGroup>([]),
    addresses: this.fb.array<FormGroup>([]),
    coverages: this.fb.array<FormGroup>([]),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => {
    const v = this.id();
    return v != null && v !== '';
  });
  readonly invalid = computed(() => this.status() === 'INVALID');

  readonly dniDuplicate = computed(() => {
    if (this.isEdit()) return false;
    const dni = (this.value() as { general?: { dni?: string } } | undefined)?.general?.dni ?? '';
    const clean = dni.toString().replace(/\D/g, '');
    const check = this.state().dniCheck;
    if (!check) return false;
    return check.dni === clean && check.exists === true;
  });

  readonly canSubmit = computed(() => !this.invalid() && !this.dniDuplicate() && !this.pending());

  readonly statusEstimate = computed<'MIN' | 'COMPLETE'>(() => {
    const v = this.value() as {
      general: { firstName?: string; lastName?: string; dni?: string; birthDate?: unknown; gender?: string | null; sexAtBirth?: string | null };
      contacts: { active?: boolean }[];
      coverages: { active?: boolean }[];
    };
    const hasContact = v.contacts.some((c) => c.active);
    const hasCoverage = v.coverages.some((c) => c.active);
    const ok = !!v.general.firstName && !!v.general.lastName && !!v.general.dni
      && !!v.general.birthDate && !!v.general.gender && !!v.general.sexAtBirth
      && hasContact && hasCoverage;
    return ok ? 'COMPLETE' : 'MIN';
  });

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    if (this.form.dirty) return '● Cambios sin guardar';
    return 'Sin cambios';
  });

  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addressesArray(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coveragesArray(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
    // Load patient on edit; reset form on create.
    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.hydratedForId !== undefined) {
          this.resetForCreate();
          this.hydratedForId = undefined;
        }
        return;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        this.router.navigate(['/pacientes']);
        return;
      }
      if (this.hydratedForId !== id) {
        this.store.dispatch(loadPatient({ id: numericId }));
        this.hydratedForId = id;
      }
    });

    // Hydrate form once the patient lands in the store.
    effect(() => {
      const p = this.patient();
      if (this.isEdit() && p && String(p.id) === this.id()) {
        this.hydrate(p);
        this.form.get('general.dni')?.disable({ emitEvent: false });
      }
    });

    // DNI uniqueness check on every valid value.
    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      if (this.isEdit()) return;
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      if (/^\d{7,}$/.test(clean)) this.store.dispatch(checkPatientDni({ dni: clean }));
    });
  }

  private resetForCreate(): void {
    this.form.reset({ general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null } });
    this.contactsArray.clear();
    this.addressesArray.clear();
    this.coveragesArray.clear();
    this.form.get('general.dni')?.enable({ emitEvent: false });
  }

  private hydrate(p: Patient): void {
    this.form.patchValue({
      general: {
        firstName: p.firstName, lastName: p.lastName, dni: p.dni,
        birthDate: p.birthDate ? new Date(p.birthDate) : null,
        gender: p.gender, sexAtBirth: p.sexAtBirth,
      },
    });
    this.contactsArray.clear();
    p.contacts.forEach((c) => this.contactsArray.push(ContactSectionComponent.toFormGroup(this.fb, c)));
    this.addressesArray.clear();
    p.addresses.forEach((a) => this.addressesArray.push(AddressSectionComponent.toFormGroup(this.fb, a)));
    this.coveragesArray.clear();
    p.coverages.forEach((c) => this.coveragesArray.push(CoverageSectionComponent.toFormGroup(this.fb, c)));
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    if (err.status === 409) return 'Ya existe un paciente con ese DNI.';
    return err.error?.message ?? 'No se pudo guardar el paciente.';
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const raw = this.form.getRawValue() as {
      general: { firstName: string; lastName: string; dni: string; birthDate: Date | string | null; gender: Gender | null; sexAtBirth: SexAtBirth | null };
      contacts: never[]; addresses: never[]; coverages: never[];
    };
    const common = {
      firstName: raw.general.firstName, lastName: raw.general.lastName,
      birthDate: isoFromDate(raw.general.birthDate),
      gender: raw.general.gender, sexAtBirth: raw.general.sexAtBirth,
      contacts: raw.contacts, addresses: raw.addresses, coverages: raw.coverages,
    };
    const editId = this.id();
    if (editId) {
      const req: UpdatePatientRequest = common;
      this.store.dispatch(updatePatient({ id: Number(editId), req }));
    } else {
      const req: CreatePatientRequest = { ...common, dni: raw.general.dni };
      this.store.dispatch(addPatient({ req }));
    }
  }

  onBack(): void {
    // Guard added in Task 5.
    this.router.navigate(['/pacientes']);
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedPatient());
  }
}
```

- [ ] **Step 4: Add MockStore import to the spec**

In `patient-form.page.spec.ts`, change the existing import line from:

```ts
import { provideMockStore, MockStore } from '@ngrx/store/testing';
```

(It's already correct from Task 2. If the new tests added in Step 1 reference `MockStore` and it's not imported, this is where you fix it. Verify with: `npm run test -- patient-form.page.spec` shows no missing-import errors.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- patient-form.page.spec`
Expected: 4 tests PASS (render-create, render-edit, dni-check, add-dispatch).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/
git commit -m "feat(pacientes): port form to PatientFormPage (general + sections + submit)"
```

---

## Task 4: Redirect to /pacientes after successful save

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 1: Write a failing redirect test**

Append to `patient-form.page.spec.ts`:

```ts
  it('navigates to /pacientes after addPatientSuccess', async () => {
    const { addPatientSuccess } = await import('../../store/patient.actions');
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    actions$.next(addPatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('navigates to /pacientes after updatePatientSuccess', async () => {
    const { updatePatientSuccess } = await import('../../store/patient.actions');
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    actions$.next(updatePatientSuccess({ patient }));
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- patient-form.page.spec`
Expected: 2 new tests FAIL — `navigate` not called.

- [ ] **Step 3: Subscribe to success actions in the page**

In `patient-form.page.ts`:

(a) Add imports near the top:

```ts
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
```

(b) Update the actions imports to include the success variants:

```ts
import {
  addPatient, addPatientSuccess, updatePatient, updatePatientSuccess,
  checkPatientDni, loadPatient, clearSelectedPatient,
} from '../../store/patient.actions';
```

(c) Inject `Actions` in the class (next to `router`):

```ts
  private readonly actions$ = inject(Actions);
```

(d) In the constructor, after the existing `effect()` calls and DNI subscription, add:

```ts
    this.actions$
      .pipe(ofType(addPatientSuccess, updatePatientSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/pacientes']));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- patient-form.page.spec`
Expected: all PatientFormPage tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/
git commit -m "feat(pacientes): redirect to list after successful save"
```

---

## Task 5: Add unsaved-changes guard on Back/Cancel

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 1: Write failing tests for the guard**

Append to `patient-form.page.spec.ts`:

```ts
  it('navigates back without confirmation when the form is pristine', async () => {
    const { Router } = await import('@angular/router');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.onBack();
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('opens confirmation when the form is dirty, navigates only on accept', async () => {
    const { Router } = await import('@angular/router');
    const { ConfirmationService } = await import('primeng/api');
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    fixture.componentInstance.form.get('general.firstName')?.setValue('Ana');
    fixture.componentInstance.form.markAsDirty();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const confirmSvc = TestBed.inject(ConfirmationService);
    const confirmSpy = vi.spyOn(confirmSvc, 'confirm')
      .mockImplementation((opts: { accept?: () => void }) => { opts.accept?.(); return confirmSvc; });
    fixture.componentInstance.onBack();
    expect(confirmSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/pacientes']);
  });
```

Add `ConfirmationService` to the `providers` array in the `beforeEach` TestBed setup so DI can inject it:

```ts
        provideRouter([]),
        { provide: 'ConfirmationServiceTestSentinel', useValue: null }, // (no-op)
```

(Actually `ConfirmationService` is provided by the component itself via `providers: [ConfirmationService]` — added in step 2 below — so no test-level provider change is needed.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- patient-form.page.spec`
Expected: the new "confirm" test FAILs because `confirm` is not called.

- [ ] **Step 3: Wire ConfirmationService and ConfirmDialog into the page**

In `patient-form.page.ts`:

(a) Add imports:

```ts
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
```

(b) Add `ConfirmDialogModule` to the component's `imports` array.

(c) Add a component-scoped provider in the decorator:

```ts
  providers: [ConfirmationService],
```

(d) Inject in the class:

```ts
  private readonly confirm = inject(ConfirmationService);
```

(e) Add `<p-confirmDialog />` at the end of the template (before the closing `</form>`):

```html
      <p-confirmDialog />
```

(f) Replace the `onBack` method body:

```ts
  onBack(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/pacientes']),
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- patient-form.page.spec`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/
git commit -m "feat(pacientes): confirm before discarding unsaved patient form changes"
```

---

## Task 6: Keyboard shortcuts (Ctrl+S to submit, Esc to back)

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 1: Write failing tests**

Append to `patient-form.page.spec.ts`:

```ts
  it('submits on Ctrl+S', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const submitSpy = vi.spyOn(fixture.componentInstance, 'onSubmit');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    expect(submitSpy).toHaveBeenCalled();
  });

  it('goes back on Escape', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const backSpy = vi.spyOn(fixture.componentInstance, 'onBack');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(backSpy).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- patient-form.page.spec`
Expected: 2 new tests FAIL.

- [ ] **Step 3: Add the host listener**

In `patient-form.page.ts`:

(a) Add `HostListener` to the `@angular/core` imports.

(b) Add the listener method inside the class:

```ts
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      this.onSubmit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onBack();
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- patient-form.page.spec`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/
git commit -m "feat(pacientes): Ctrl+S and Esc shortcuts on patient form page"
```

---

## Task 7: Swap drawer for routerLinks in PatientListPage

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-list/patient-list.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts`

- [ ] **Step 1: Update the list page**

In `patient-list.page.ts`:

(a) Remove this import:

```ts
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';
```

(b) Remove `PatientFormDrawerComponent` from the component's `imports` array.

(c) Remove the unused imports `signal` from `@angular/core` and the `Patient` import if it's only used by drawer state. The `Patient` type is still referenced by `confirmToggle` so keep it. Drop `signal` only if no longer used.

(d) In the class, delete these members and methods:

```ts
  readonly drawerOpen = signal(false);
  readonly editing = signal<Patient | null>(null);
  openCreate(): void { ... }
  openEdit(p: Patient): void { ... }
  onDrawerClosed(): void { ... }
```

(e) In the template, delete this line:

```html
      <pat-form-drawer [open]="drawerOpen()" [patient]="editing()" (closed)="onDrawerClosed()" />
```

(f) Change the "Nuevo paciente" button from a click handler to a `routerLink`. Replace:

```html
            <p-button label="Nuevo paciente" icon="pi pi-plus" (onClick)="openCreate()" />
```

with:

```html
            <a [routerLink]="['/pacientes', 'nuevo']">
              <p-button label="Nuevo paciente" icon="pi pi-plus" />
            </a>
```

(g) Change the per-row "Editar" icon button. Replace:

```html
                  <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" (onClick)="openEdit(p)" />
```

with:

```html
                  <a [routerLink]="['/pacientes', p.id, 'editar']">
                    <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" />
                  </a>
```

(h) Change the empty-state CTA. Replace:

```html
                  <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" (ctaClick)="openCreate()" />
```

with:

```html
                  <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente"
                                  ctaRouterLink="/pacientes/nuevo" />
```

If `ui-empty-state` does not support a `ctaRouterLink` input, fall back to wrapping with an anchor:

```html
                  <a [routerLink]="['/pacientes', 'nuevo']">
                    <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" />
                  </a>
```

Pick whichever matches the component's existing API (open `src/app/shared/ui/components/empty-state/empty-state.component.ts` to verify).

- [ ] **Step 2: Update the list page spec — drop drawer cases, assert routerLinks**

Open `patient-list.page.spec.ts`. Remove any test referencing `drawerOpen`, `editing`, `openCreate`, `openEdit`, or the drawer component.

Add:

```ts
  it('renders a routerLink to /pacientes/nuevo on the "Nuevo paciente" button', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/href="[^"]*\/pacientes\/nuevo"/);
  });
```

(Use the testing patterns already present in the file; mirror its imports.)

- [ ] **Step 3: Run the list spec**

Run: `npm run test -- patient-list.page.spec`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/pages/patient-list/
git commit -m "refactor(pacientes): swap form drawer for routerLinks on list page"
```

---

## Task 8: Swap drawer for routerLink in PatientDetailPage

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Update the detail page**

In `patient-detail.page.ts`:

(a) Remove the import:

```ts
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';
```

(b) Remove `PatientFormDrawerComponent` from the `imports` array of the decorator.

(c) Remove the `signal` import from `@angular/core` if it's not referenced elsewhere in the file (check uses).

(d) Remove the class member:

```ts
  readonly drawerOpen = signal(false);
```

(e) In the template, replace the "Editar" button:

```html
              <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" (onClick)="drawerOpen.set(true)" />
```

with:

```html
              <a [routerLink]="['/pacientes', p.id, 'editar']">
                <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" />
              </a>
```

(f) Remove the drawer instance from the template:

```html
        <pat-form-drawer [open]="drawerOpen()" [patient]="p" (closed)="drawerOpen.set(false)" />
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/pages/patient-detail/
git commit -m "refactor(pacientes): swap drawer for routerLink on detail Edit button"
```

---

## Task 9: Delete the drawer component

**Files:**
- Delete: `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.ts`
- Delete: `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.spec.ts`

- [ ] **Step 1: Verify no remaining references**

Run: `npm run -s grep -- "patient-form-drawer"` (or use ripgrep): expect zero hits other than the file paths themselves.

Run: `npm run -s grep -- "PatientFormDrawerComponent"`: expect zero hits.

If anything still references them, fix it before deleting.

- [ ] **Step 2: Delete the files**

```bash
rm src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.ts
rm src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.spec.ts
rmdir src/app/features/pacientes/components/patient-form-drawer
```

- [ ] **Step 3: Build + full test run**

Run: `npm run build`
Expected: PASS.

Run: `npm run test -- pacientes`
Expected: all patient-feature tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/features/pacientes/components/patient-form-drawer
git commit -m "chore(pacientes): remove obsolete PatientFormDrawerComponent"
```

---

## Task 10: Smoke test in the browser

**Files:** none (manual verification).

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

- [ ] **Step 2: Manual checklist** — exercise each path and confirm no regressions:

- Navigate to `/pacientes`. Click "Nuevo paciente" → lands on `/pacientes/nuevo` inside the admin shell (topbar + sidebar visible). Header shows "← Volver  Nuevo paciente".
- Fill the form with a valid DNI; the duplicate check fires; submit registers the patient and redirects to `/pacientes`.
- From the list, click ✏️ on a row → lands on `/pacientes/:id/editar`; form hydrates; DNI is disabled; header shows "Editar paciente · Apellido, Nombre".
- Edit a field, click "← Volver" → confirm dialog appears; rejecting keeps editing; accepting goes to `/pacientes`.
- Press `Ctrl+S` with a valid form → submits.
- Press `Esc` → triggers Back (with confirm if dirty).
- From the detail page (`/pacientes/:id`), click "Editar" → goes to the form page.
- Deep-link directly to `/pacientes/<known-id>/editar` (paste in URL bar) → form loads with patient hydrated.

- [ ] **Step 3: Commit checklist note (optional)** — no code changes.

If you found regressions, open subtasks; otherwise this plan is done.

---

## Self-review notes

- **Spec coverage:** routing (Task 1) ✓, back button + always-list destination (Task 2 + Task 5) ✓, post-save redirect (Task 4) ✓, two-column layout (Task 3) ✓, sticky header + footer (Task 3) ✓, form status indicator (Task 3 — `formStatusLabel` computed) ✓, Ctrl+S/Esc shortcuts (Task 6) ✓, unsaved-changes confirm (Task 5) ✓, drawer removal (Task 7-9) ✓.
- **Deep-link load:** Task 3's first effect dispatches `loadPatient` when `id` is present; second effect hydrates when `selectSelectedPatient` arrives. Covered.
- **No placeholders:** every code-changing step shows the exact code or diff. Manual smoke (Task 10) is the only "checklist" step and is appropriate for browser-only verification.
- **Type consistency:** `id` is `string | undefined` everywhere (route param), converted to `Number` only at dispatch boundaries; `isEdit()` derives from `id`; `patient()` from `selectSelectedPatient`. Consistent.
