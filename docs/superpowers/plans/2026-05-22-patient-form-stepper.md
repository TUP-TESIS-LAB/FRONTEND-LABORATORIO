# Patient Form Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la pantalla `patient-form.page.ts` (alta y edición de paciente) de un grid de 4 cards en una sola vista a un stepper horizontal de 3 pasos (Datos generales → Coberturas → Contacto & Dirección), con sólo el paso 1 obligatorio y submit únicamente en el último paso (o cualquier paso en edición).

**Architecture:** El shell (`patient-form.page.ts`) conserva el `FormGroup` raíz, la integración NgRx y los atajos. Se introduce un componente `FormStepperHeaderComponent` puro presentacional y tres componentes de paso (`GeneralStep`, `CoveragesStep`, `ContactAddressStep`) que reciben los sub-FormGroup/FormArray como input. La definición de pasos vive en una constante exportada `PATIENT_FORM_STEPS`. Estado del stepper: signals `currentStep` y `visitedSteps`.

**Tech Stack:** Angular 21 standalone + signals + OnPush, Reactive Forms, NgRx clásico, PrimeNG (Button/Select/Datepicker/etc), Tailwind, Vitest.

**Spec:** [docs/superpowers/specs/2026-05-22-patient-form-stepper-design.md](../specs/2026-05-22-patient-form-stepper-design.md)

---

## Estructura de archivos

```
src/app/features/pacientes/pages/patient-form/
├── patient-form.page.ts                         # MODIFICAR (shell + signals stepper)
├── patient-form.page.spec.ts                    # MODIFICAR (tests para transiciones)
├── patient-form-steps.ts                        # NUEVO (constante PATIENT_FORM_STEPS)
├── patient-form-steps.spec.ts                   # NUEVO
├── steps/
│   ├── general-step/
│   │   ├── general-step.component.ts            # NUEVO
│   │   └── general-step.component.spec.ts       # NUEVO
│   ├── coverages-step/
│   │   ├── coverages-step.component.ts          # NUEVO
│   │   └── coverages-step.component.spec.ts     # NUEVO
│   └── contact-address-step/
│       ├── contact-address-step.component.ts    # NUEVO
│       └── contact-address-step.component.spec.ts # NUEVO
└── components/
    └── form-stepper-header/
        ├── form-stepper-header.component.ts     # NUEVO
        └── form-stepper-header.component.spec.ts # NUEVO
```

Convención: el `patient-form-steps.ts` es código compartido por el shell y el header. Los `steps/*-step` son componentes que envuelven los componentes de sección ya existentes (`ContactSectionComponent`, `AddressSectionComponent`, `CoverageSectionComponent`) — no se modifican esos componentes.

---

## Task 1: Constante `PATIENT_FORM_STEPS` y tipos

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/patient-form-steps.ts`
- Test:   `src/app/features/pacientes/pages/patient-form/patient-form-steps.spec.ts`

- [ ] **Step 1.1: Test failing**

```ts
// patient-form-steps.spec.ts
import { describe, it, expect } from 'vitest';
import { PATIENT_FORM_STEPS, PatientFormStepKey } from './patient-form-steps';

describe('PATIENT_FORM_STEPS', () => {
  it('exposes exactly 3 steps in display order', () => {
    expect(PATIENT_FORM_STEPS.map((s) => s.key)).toEqual<PatientFormStepKey[]>([
      'general', 'coverages', 'contact-address',
    ]);
  });

  it('marks only the first step as required', () => {
    expect(PATIENT_FORM_STEPS[0].required).toBe(true);
    expect(PATIENT_FORM_STEPS[1].required).toBe(false);
    expect(PATIENT_FORM_STEPS[2].required).toBe(false);
  });

  it('every step has title and subtitle copy', () => {
    for (const step of PATIENT_FORM_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.subtitle.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 1.2: Run test, expect failure**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/patient-form-steps.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement**

```ts
// patient-form-steps.ts
export type PatientFormStepKey = 'general' | 'coverages' | 'contact-address';

export interface PatientFormStep {
  readonly key: PatientFormStepKey;
  readonly title: string;
  readonly subtitle: string;
  readonly required: boolean;
}

export const PATIENT_FORM_STEPS: readonly PatientFormStep[] = [
  { key: 'general', title: 'Datos generales', subtitle: 'Identidad del paciente', required: true },
  { key: 'coverages', title: 'Coberturas', subtitle: 'Obras sociales · opcional', required: false },
  { key: 'contact-address', title: 'Contacto & Dirección', subtitle: 'Cómo ubicarlo · opcional', required: false },
] as const;
```

- [ ] **Step 1.4: Run test, expect pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/patient-form-steps.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 1.5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/patient-form-steps.ts \
        src/app/features/pacientes/pages/patient-form/patient-form-steps.spec.ts
git commit -m "feat(pacientes): add patient-form step definition"
```

---

## Task 2: `FormStepperHeaderComponent`

Componente presentacional puro: renderiza los 3 círculos con su connector y emite `stepSelected` sólo para pasos que el shell le indica como navegables.

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/components/form-stepper-header/form-stepper-header.component.ts`
- Test:   `src/app/features/pacientes/pages/patient-form/components/form-stepper-header/form-stepper-header.component.spec.ts`

- [ ] **Step 2.1: Test failing**

```ts
// form-stepper-header.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { FormStepperHeaderComponent } from './form-stepper-header.component';
import { PATIENT_FORM_STEPS } from '../../patient-form-steps';

@Component({
  standalone: true,
  imports: [FormStepperHeaderComponent],
  template: `
    <pat-form-stepper-header
      [steps]="steps"
      [currentIndex]="current"
      [visited]="visited"
      (stepSelected)="onStep($event)" />
  `,
})
class HostCmp {
  steps = PATIENT_FORM_STEPS;
  current = 1;
  visited = new Set<number>([0, 1]);
  onStep = vi.fn();
}

describe('FormStepperHeaderComponent', () => {
  it('renders one item per step with the step title', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Datos generales');
    expect(html).toContain('Coberturas');
    expect(html).toContain('Contacto & Dirección');
  });

  it('marks the current step with the "current" class', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const items = (fx.nativeElement as HTMLElement).querySelectorAll('[data-step]');
    expect(items[1].classList.contains('is-current')).toBe(true);
    expect(items[0].classList.contains('is-done')).toBe(true);
    expect(items[2].classList.contains('is-locked')).toBe(true);
  });

  it('emits stepSelected when clicking a done step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const done = (fx.nativeElement as HTMLElement).querySelector('[data-step="0"]') as HTMLElement;
    done.click();
    expect(fx.componentInstance.onStep).toHaveBeenCalledWith(0);
  });

  it('does NOT emit stepSelected when clicking a locked step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const locked = (fx.nativeElement as HTMLElement).querySelector('[data-step="2"]') as HTMLElement;
    locked.click();
    expect(fx.componentInstance.onStep).not.toHaveBeenCalled();
  });

  it('does NOT emit stepSelected when clicking the current step', () => {
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const current = (fx.nativeElement as HTMLElement).querySelector('[data-step="1"]') as HTMLElement;
    current.click();
    expect(fx.componentInstance.onStep).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2.2: Run test, expect failure**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/components/form-stepper-header/form-stepper-header.component.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 2.3: Implement component**

```ts
// form-stepper-header.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PatientFormStep } from '../../patient-form-steps';

@Component({
  selector: 'pat-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="pat-stepper">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) { <li class="pat-stepper__connector" [class.is-done]="isDone(i - 1)"></li> }
        <li
          class="pat-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.data-step]="i"
          (click)="onClick(i)"
        >
          <span class="pat-stepper__num">
            @if (isDone(i)) { ✓ } @else { {{ i + 1 }} }
          </span>
          <span class="pat-stepper__lbl">
            <span class="pat-stepper__title">{{ step.title }}</span>
            <span class="pat-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    .pat-stepper { display:flex; align-items:center; gap:6px; list-style:none; margin:0; padding:14px 24px; border-bottom:1px solid var(--surface-300); background:var(--surface-0); }
    .pat-stepper__item { display:flex; align-items:center; gap:8px; color:var(--surface-500); cursor:default; padding:4px 6px; border-radius:6px; }
    .pat-stepper__item.is-clickable { cursor:pointer; }
    .pat-stepper__item.is-clickable:hover { background:var(--surface-100); }
    .pat-stepper__num { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--surface-300); display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; background:var(--surface-0); }
    .pat-stepper__item.is-done .pat-stepper__num { background:var(--ds-success, #10b981); border-color:var(--ds-success, #10b981); color:#fff; }
    .pat-stepper__item.is-done { color:var(--text-color); }
    .pat-stepper__item.is-current .pat-stepper__num { background:var(--primary-color); border-color:var(--primary-color); color:var(--primary-contrast-color); }
    .pat-stepper__item.is-current { color:var(--primary-color); font-weight:600; }
    .pat-stepper__item.is-locked { color:var(--surface-400); }
    .pat-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.15; }
    .pat-stepper__title { font-size:12px; }
    .pat-stepper__sub { font-size:10px; color:var(--surface-500); }
    .pat-stepper__connector { flex:1; height:2px; background:var(--surface-300); margin:0 2px; }
    .pat-stepper__connector.is-done { background:var(--ds-success, #10b981); }
  `],
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly PatientFormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void {
    if (this.isClickable(i)) this.stepSelected.emit(i);
  }
}
```

- [ ] **Step 2.4: Run test, expect pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/components/form-stepper-header/form-stepper-header.component.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 2.5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/components/form-stepper-header/
git commit -m "feat(pacientes): add FormStepperHeader component"
```

---

## Task 3: `GeneralStepComponent`

Wrapper presentacional para el sub-FormGroup `general`. Recibe el `FormGroup` y un signal con el estado de duplicado de DNI; renderiza los campos que hoy están inline en `patient-form.page.ts`. Es prácticamente un mover del template actual a su propio componente.

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/steps/general-step/general-step.component.ts`
- Test:   `src/app/features/pacientes/pages/patient-form/steps/general-step/general-step.component.spec.ts`

- [ ] **Step 3.1: Test failing**

```ts
// general-step.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { GeneralStepComponent } from './general-step.component';

@Component({
  standalone: true,
  imports: [GeneralStepComponent],
  template: `
    <pat-general-step [group]="group" [dniDuplicate]="dup()" [editMode]="edit" />
  `,
})
class HostCmp {
  private readonly fb = new FormBuilder();
  group = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dni: ['', [Validators.required]],
    birthDate: [null],
    gender: [null],
    sexAtBirth: [null],
  });
  dup = signal(false);
  edit = false;
}

describe('GeneralStepComponent', () => {
  function setup(edit = false) {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.componentInstance.edit = edit;
    fx.detectChanges();
    return fx;
  }

  it('renders the 6 general fields', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Apellido');
    expect(html).toContain('Nombre');
    expect(html).toContain('DNI');
    expect(html).toContain('Fecha de nacimiento');
    expect(html).toContain('Género');
    expect(html).toContain('Sexo registral');
  });

  it('shows the duplicate-DNI error when dniDuplicate is true', () => {
    const fx = setup();
    fx.componentInstance.dup.set(true);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Ya existe un paciente con ese DNI');
  });

  it('does not show the duplicate-DNI error when dniDuplicate is false', () => {
    const fx = setup();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).not.toContain('Ya existe un paciente con ese DNI');
  });

  it('disables the dni input when editMode is true', () => {
    const fx = setup(true);
    const dniInput = (fx.nativeElement as HTMLElement).querySelector('input[formcontrolname="dni"]') as HTMLInputElement;
    expect(dniInput.disabled).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test, expect failure**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/general-step/`
Expected: FAIL — component not found.

- [ ] **Step 3.3: Implement**

```ts
// general-step.component.ts
import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Gender, SexAtBirth } from '../../../../models/patient.model';

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

@Component({
  selector: 'pat-general-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, DatePickerModule],
  template: `
    <div class="pat-form__grid" [formGroup]="group()">
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
        <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
      <div class="pat-form__field">
        <label class="pat-form__label">Sexo registral</label>
        <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" placeholder="—" appendTo="body" class="w-full" />
      </div>
    </div>
  `,
})
export class GeneralStepComponent {
  readonly group = input.required<FormGroup>();
  readonly dniDuplicate = input<boolean>(false);
  readonly editMode = input<boolean>(false);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  constructor() {
    effect(() => {
      const dniCtrl = this.group().get('dni');
      if (!dniCtrl) return;
      if (this.editMode()) dniCtrl.disable({ emitEvent: false });
      else dniCtrl.enable({ emitEvent: false });
    });
  }
}
```

- [ ] **Step 3.4: Run test, expect pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/general-step/`
Expected: PASS (4 tests).

- [ ] **Step 3.5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/steps/general-step/
git commit -m "feat(pacientes): add GeneralStep component"
```

---

## Task 4: `CoveragesStepComponent`

Wrapper sobre `CoverageSectionComponent` existente. Recibe el `FormArray` y el copy de paso opcional.

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/steps/coverages-step/coverages-step.component.ts`
- Test:   `src/app/features/pacientes/pages/patient-form/steps/coverages-step/coverages-step.component.spec.ts`

- [ ] **Step 4.1: Test failing**

```ts
// coverages-step.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CoveragesStepComponent } from './coverages-step.component';

@Component({
  standalone: true,
  imports: [CoveragesStepComponent],
  template: `<pat-coverages-step [array]="array" />`,
})
class HostCmp {
  array: FormArray<FormGroup> = new FormBuilder().array<FormGroup>([]);
}

describe('CoveragesStepComponent', () => {
  it('renders the optional copy', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('opcional');
    expect(html).toContain('particular');
  });

  it('renders the underlying CoverageSectionComponent', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const el = (fx.nativeElement as HTMLElement).querySelector('pat-coverage-section');
    expect(el).not.toBeNull();
  });
});
```

- [ ] **Step 4.2: Run test, expect failure**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/coverages-step/`
Expected: FAIL — component not found.

- [ ] **Step 4.3: Implement**

```ts
// coverages-step.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CoverageSectionComponent } from '../../../../components/coverage-section/coverage-section.component';

@Component({
  selector: 'pat-coverages-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoverageSectionComponent],
  template: `
    <div class="pat-step">
      <h2 class="pat-step__title">Coberturas <span class="pat-step__opt">· opcional</span></h2>
      <p class="pat-step__hint">Si no agregás ninguna, el paciente queda como particular. Podés sumarlas más tarde.</p>
      <pat-coverage-section [array]="array()" />
    </div>
  `,
})
export class CoveragesStepComponent {
  readonly array = input.required<FormArray<FormGroup>>();
}
```

- [ ] **Step 4.4: Run test, expect pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/coverages-step/`
Expected: PASS (2 tests).

- [ ] **Step 4.5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/steps/coverages-step/
git commit -m "feat(pacientes): add CoveragesStep component"
```

---

## Task 5: `ContactAddressStepComponent`

Paso 3: dos sub-secciones (contactos + direcciones) dentro del mismo paso.

**Files:**
- Create: `src/app/features/pacientes/pages/patient-form/steps/contact-address-step/contact-address-step.component.ts`
- Test:   `src/app/features/pacientes/pages/patient-form/steps/contact-address-step/contact-address-step.component.spec.ts`

- [ ] **Step 5.1: Test failing**

```ts
// contact-address-step.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ContactAddressStepComponent } from './contact-address-step.component';

@Component({
  standalone: true,
  imports: [ContactAddressStepComponent],
  template: `<pat-contact-address-step [contacts]="contacts" [addresses]="addresses" />`,
})
class HostCmp {
  private readonly fb = new FormBuilder();
  contacts: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
  addresses: FormArray<FormGroup> = this.fb.array<FormGroup>([]);
}

describe('ContactAddressStepComponent', () => {
  it('renders both subsection titles', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const html = (fx.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('Contactos');
    expect(html).toContain('Direcciones');
  });

  it('renders the underlying contact and address sections', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fx = TestBed.createComponent(HostCmp);
    fx.detectChanges();
    const root = fx.nativeElement as HTMLElement;
    expect(root.querySelector('pat-contact-section')).not.toBeNull();
    expect(root.querySelector('pat-address-section')).not.toBeNull();
  });
});
```

- [ ] **Step 5.2: Run test, expect failure**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/contact-address-step/`
Expected: FAIL — component not found.

- [ ] **Step 5.3: Implement**

```ts
// contact-address-step.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { ContactSectionComponent } from '../../../../components/contact-section/contact-section.component';
import { AddressSectionComponent } from '../../../../components/address-section/address-section.component';

@Component({
  selector: 'pat-contact-address-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactSectionComponent, AddressSectionComponent],
  template: `
    <div class="pat-step">
      <h2 class="pat-step__title">Contacto y dirección <span class="pat-step__opt">· opcional</span></h2>
      <p class="pat-step__hint">Cómo ubicar al paciente. Podés saltarlo y registrarlo igual.</p>

      <section class="pat-step__subsec">
        <h3 class="pat-step__subtitle">Contactos</h3>
        <pat-contact-section [array]="contacts()" />
      </section>

      <section class="pat-step__subsec">
        <h3 class="pat-step__subtitle">Direcciones</h3>
        <pat-address-section [array]="addresses()" />
      </section>
    </div>
  `,
})
export class ContactAddressStepComponent {
  readonly contacts = input.required<FormArray<FormGroup>>();
  readonly addresses = input.required<FormArray<FormGroup>>();
}
```

- [ ] **Step 5.4: Run test, expect pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/steps/contact-address-step/`
Expected: PASS (2 tests).

- [ ] **Step 5.5: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/steps/contact-address-step/
git commit -m "feat(pacientes): add ContactAddressStep component"
```

---

## Task 6: Refactor `PatientFormPage` shell

Reemplazar el grid actual por el shell del stepper: header + `FormStepperHeaderComponent` + body con el paso activo + footer con Cancelar/Atrás/Continuar (o Registrar/Guardar).

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`

- [ ] **Step 6.1: Reemplazar el template e introducir signals de stepper**

Reemplazar completo el contenido de `patient-form.page.ts` por la siguiente implementación. Conserva todo el cableado NgRx, los effects y los atajos.

```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, addPatientSuccess, updatePatient, updatePatientSuccess,
  checkPatientDni, loadPatient, clearSelectedPatient,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState, selectSelectedPatient,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../../components/contact-section/contact-section.component';
import { AddressSectionComponent } from '../../components/address-section/address-section.component';
import { CoverageSectionComponent } from '../../components/coverage-section/coverage-section.component';
import { FormStepperHeaderComponent } from './components/form-stepper-header/form-stepper-header.component';
import { GeneralStepComponent } from './steps/general-step/general-step.component';
import { CoveragesStepComponent } from './steps/coverages-step/coverages-step.component';
import { ContactAddressStepComponent } from './steps/contact-address-step/contact-address-step.component';
import { PATIENT_FORM_STEPS } from './patient-form-steps';

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
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, GeneralStepComponent, CoveragesStepComponent, ContactAddressStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
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

      <pat-form-stepper-header
        [steps]="steps"
        [currentIndex]="currentStep()"
        [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-screen-md mx-auto">
          @if (saveError(); as err) {
            <div class="pat-form__card"
                 style="background:#fef2f2;border-color:var(--ds-danger);color:var(--ds-danger);margin-bottom:12px;">
              {{ saveErrorMessage(err) }}
            </div>
          }

          @switch (currentStep()) {
            @case (0) {
              <pat-general-step
                [group]="generalGroup"
                [dniDuplicate]="dniDuplicate()"
                [editMode]="isEdit()" />
            }
            @case (1) {
              <pat-coverages-step [array]="coveragesArray" />
            }
            @case (2) {
              <pat-contact-address-step
                [contacts]="contactsArray"
                [addresses]="addressesArray" />
            }
          }
        </div>
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">{{ formStatusLabel() }}</span>
        <span class="text-xs text-surface-400 ml-2">
          Paso {{ currentStep() + 1 }} de {{ steps.length }} ·
          <kbd>Ctrl</kbd>+<kbd>S</kbd> para guardar · <kbd>Esc</kbd> para volver
        </span>
        <div class="ml-auto flex gap-2">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
          @if (!isFirstStep()) {
            <p-button label="← Atrás" [text]="true" type="button" (onClick)="goBack()" />
          }
          @if (showContinueButton()) {
            <p-button
              label="Continuar →"
              type="button"
              [disabled]="!canContinue()"
              (onClick)="goNext()" />
          }
          @if (showSubmitButton()) {
            <p-button
              [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
              type="submit"
              severity="success"
              [loading]="pending()"
              [disabled]="!canSubmit()" />
          }
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class PatientFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = PATIENT_FORM_STEPS;

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

  readonly step0Valid = computed(() => {
    void this.value(); void this.status();
    const g = this.form.get('general');
    return !!g && g.valid && !this.dniDuplicate();
  });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.step0Valid();
    return true;
  });

  readonly canSubmit = computed(() => this.step0Valid() && !this.pending());

  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  get generalGroup(): FormGroup { return this.form.get('general') as FormGroup; }
  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addressesArray(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coveragesArray(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
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

    effect(() => {
      const p = this.patient();
      if (this.isEdit() && p && String(p.id) === this.id()) {
        this.hydrate(p);
        this.visited.set(new Set([0, 1, 2]));
      }
    });

    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      if (this.isEdit()) return;
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      if (/^\d{7,}$/.test(clean)) this.store.dispatch(checkPatientDni({ dni: clean }));
    });

    this.actions$
      .pipe(ofType(addPatientSuccess, updatePatientSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigate(['/pacientes']));
  }

  goNext(): void {
    if (!this.canContinue()) {
      this.form.get('general')?.markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }

  goBack(): void {
    const prev = Math.max(this.currentStep() - 1, 0);
    this.currentStep.set(prev);
  }

  goToStep(i: number): void {
    if (!this.visited().has(i)) return;
    this.currentStep.set(i);
  }

  private resetForCreate(): void {
    this.form.reset({ general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null } });
    this.contactsArray.clear();
    this.addressesArray.clear();
    this.coveragesArray.clear();
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
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

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      this.onSubmit();
      return;
    }
    if (e.key === 'Escape') {
      const overlayOpen = document.querySelector('.p-overlay-mask, .p-datepicker-panel, .p-select-overlay');
      if (overlayOpen) return;
      e.preventDefault();
      this.onBack();
    }
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

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedPatient());
  }
}
```

- [ ] **Step 6.2: Build typecheck**

Run: `npx ng build --configuration development 2>&1 | tail -20` (o `npm run build`)
Expected: build completa sin errores TypeScript. Si falla, corregir imports / paths antes de pasar al test.

- [ ] **Step 6.3: Re-run smoke tests existentes**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`
Expected: la mayoría de los tests viejos siguen pasando (los headers, la dispatch de checkDni, addPatient, etc.). Algunos van a romper porque el footer cambió o porque ya no hay submit en paso 0; eso se arregla en Task 7.

- [ ] **Step 6.4: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/patient-form.page.ts
git commit -m "feat(pacientes): rebuild patient-form as 3-step stepper shell"
```

---

## Task 7: Actualizar tests de `PatientFormPage` para el stepper

Los tests viejos asumen un único form sin pasos. Algunos siguen siendo válidos (Ctrl+S, Esc, header, navegación post-success), pero hay que **agregar** tests de transiciones y **ajustar** el de submit en alta (ahora requiere estar en el último paso).

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`

- [ ] **Step 7.1: Test failing — submit sólo en último paso (alta)**

Reemplazar el test existente `'dispatches addPatient on submit in create mode'` por:

```ts
  it('dispatches addPatient on submit only after advancing to the last step', async () => {
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
    // En alta, onSubmit en paso 0 no debe disparar add (sólo el último paso submitea)
    expect(cmp.showSubmitButton()).toBe(false);
    // Avanzar a paso 2
    cmp.goNext(); cmp.goNext();
    fixture.detectChanges();
    expect(cmp.showSubmitButton()).toBe(true);
    cmp.onSubmit();
    expect(spy).toHaveBeenCalled();
    const dispatched = spy.mock.calls[0][0] as unknown as { type: string; req: { firstName: string; dni: string } };
    expect(dispatched.type).toBe('[Patient Form] Add Patient');
    expect(dispatched.req.firstName).toBe('Ana');
    expect(dispatched.req.dni).toBe('12345678');
  });
```

- [ ] **Step 7.2: Agregar test — edición arranca con todos los pasos visitados y submit visible**

Insertar después del último test del archivo:

```ts
  it('starts edit mode with all steps visited and submit button visible from step 0', async () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const patient = {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE' as const, sexAtBirth: 'FEMALE' as const,
      status: 'COMPLETE' as const, contacts: [], addresses: [], coverages: [], active: true,
    };
    store.setState({ patients: { ...(await import('../../store/patient.state')).initialPatientState, selectedPatient: patient } });
    store.refreshState();
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect([...cmp.visited()].sort()).toEqual([0, 1, 2]);
    expect(cmp.showSubmitButton()).toBe(true);
    expect(cmp.showContinueButton()).toBe(false);
  });
```

- [ ] **Step 7.3: Agregar test — Continuar deshabilitado en paso 0 cuando datos generales son inválidos**

```ts
  it('disables Continuar on step 0 when general subgroup is invalid', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    expect(cmp.canContinue()).toBe(false);
    cmp.form.patchValue({
      general: {
        firstName: 'Ana', lastName: 'Pérez', dni: '12345678',
        birthDate: new Date('1990-01-01'),
        gender: 'FEMALE', sexAtBirth: 'FEMALE',
      },
    });
    expect(cmp.canContinue()).toBe(true);
  });
```

- [ ] **Step 7.4: Agregar test — goNext en paso 0 inválido no avanza y marca touched**

```ts
  it('goNext on step 0 with invalid general does not advance and marks touched', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.goNext();
    expect(cmp.currentStep()).toBe(0);
    expect(cmp.form.get('general.firstName')?.touched).toBe(true);
  });
```

- [ ] **Step 7.5: Agregar test — goToStep no permite saltar a pasos no visitados**

```ts
  it('goToStep ignores indexes that are not yet visited', () => {
    const fixture = TestBed.createComponent(PatientFormPage);
    fixture.componentRef.setInput('id', undefined);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.goToStep(2);
    expect(cmp.currentStep()).toBe(0);
  });
```

- [ ] **Step 7.6: Run tests, expect all pass**

Run: `npx vitest run src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`
Expected: PASS (todos los tests viejos + 4 nuevos).

- [ ] **Step 7.7: Commit**

```bash
git add src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts
git commit -m "test(pacientes): cover patient-form stepper transitions"
```

---

## Task 8: Validación end-to-end manual

- [ ] **Step 8.1: Levantar dev server**

Run: `npm start` (Angular dev server en http://localhost:4200).

- [ ] **Step 8.2: Smoke alta**

Navegar a `/pacientes/nuevo`. Verificar:
- Header muestra "Nuevo paciente" y stepper con paso 1 azul, 2 y 3 grises bloqueados.
- Footer muestra Cancelar + Continuar (deshabilitado).
- Llenar los 4 campos required de Datos generales → Continuar habilita.
- Click Continuar → paso 2 azul, paso 1 verde con ✓. Footer muestra Cancelar + Atrás + Continuar.
- Click en header de paso 1 → vuelve a paso 1.
- Avanzar a paso 3 → footer muestra Cancelar + Atrás + "Registrar paciente" verde (sin Continuar).
- Click "Registrar paciente" → redirige a `/pacientes` (asumiendo backend OK).

- [ ] **Step 8.3: Smoke edición**

Navegar a `/pacientes/<id>/editar` (un paciente existente). Verificar:
- Stepper arranca con los 3 headers en verde (todos visitados).
- Se puede saltar entre cualquier paso clickeando.
- "Guardar cambios" visible siempre en footer.
- Editar un campo → label "Cambios sin guardar".
- Ctrl+S guarda.

- [ ] **Step 8.4: Smoke teclado**

- Esc desde cualquier paso → si form pristine, vuelve a `/pacientes`; si dirty, muestra confirm dialog.
- Ctrl+S en paso 0 (alta) con datos inválidos → no submitea (canSubmit es false).
- Ctrl+S en paso 2 (alta) con datos válidos → submitea.

- [ ] **Step 8.5: Commit screenshots (opcional)**

Si se toman capturas, guardarlas en `docs/superpowers/specs/screenshots/` y commit aparte.

---

## Self-Review

- **Spec coverage:** los 6 ítems de la tabla "Decisiones tomadas" del spec están cubiertos: shell horizontal (Task 2), 3 pasos (Task 1), navegación lineal con headers clickeables (Tasks 2, 6, 7), sólo paso 1 obligatorio (Tasks 6, 7), submit solo en último paso/edición (Tasks 6, 7), modo edición con todos los pasos visitados (Tasks 6, 7), atajos conservados (Task 6 mantiene el HostListener actual).
- **Placeholder scan:** ningún "TBD", "TODO" o "implement later" presente. Todos los steps con código incluyen el bloque completo.
- **Type consistency:** `PATIENT_FORM_STEPS`, `PatientFormStep`, `FormStepperHeaderComponent` (inputs `steps/currentIndex/visited`, output `stepSelected`), métodos `goNext/goBack/goToStep`, signals `currentStep/visited` aparecen consistentemente en todas las tareas.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-05-22-patient-form-stepper.md`. Después de crear el ticket de Jira (regla #1 del CLAUDE.md del repo), dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — un subagente por tarea, review entre tareas, iteración rápida.
2. **Inline Execution** — ejecutar en esta sesión usando `executing-plans`, batch con checkpoints.
