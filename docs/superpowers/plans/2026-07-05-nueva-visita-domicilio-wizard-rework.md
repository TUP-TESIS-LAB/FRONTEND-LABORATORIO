# Rework wizard Nueva visita domiciliaria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Spec:** `docs/superpowers/specs/2026-07-05-nueva-visita-domicilio-wizard-rework-design.md`
> **Jira:** [KAN-186](https://exequielsantoro.atlassian.net/browse/KAN-186)

**Goal:** Reestructurar el alta de visita domiciliaria en un wizard de 4 pasos, con precarga de la dirección registrada del paciente (banner prefilled→edited) y alta de paciente desde el wizard (redirect + volver preseleccionado).

**Architecture:** Se modifica principalmente `nueva-visita.page.ts` (un componente standalone con `ui-wizard-shell` + Reactive Forms + signals). La precarga usa `PatientService.getById` (ya devuelve `addresses[]`). El alta de paciente reusa el mecanismo `returnTo`/`dni` que `patient-form` YA tiene (del wizard de atención); solo se agrega el `patientId` del paciente creado al redirect de vuelta.

**Tech Stack:** Angular 21 standalone + signals, Reactive Forms, NgRx clásico (store home-visit ya existe), PrimeNG, Vitest + `ng test`.

## Global Constraints

- **UI/i18n (regla #4):** todo el texto en ESPAÑOL, user-friendly, sin leak. Banner **inline, NO toast**. Íconos PrimeIcons (no emojis). Errores HTTP → toast español genérico (el effect del store ya lo hace para el alta de visita).
- **Reactividad:** los `computed` que dependen del form DEBEN leer `this.formValue()` (bridge `toSignal(form.valueChanges)` ya existente) para no quedar stale — es la causa del bug KAN-184.
- **NO romper** los computeds `step0Valid` / `step1Valid` (los referencian los tests de KAN-184). Se conservan sus nombres y se agrega `step2Valid`.
- **El servicio es el único que toca HTTP** (convención NgRx clásico). Para la lectura puntual de detalle de paciente se usa `PatientService.getById` directo (patrón ya usado por `patient-form`).
- **NgRx clásico** para el alta de visita (ya implementado: `createHomeVisit` + effect + toast). No se cambia el contrato del backend.

## Contexto verificado (no re-descubrir)

- `WizardShellComponent` (`@shared/ui/components/wizard-shell/wizard-shell.component`): inputs `steps: FormStep[]`, `currentIndex: number`, `visited`, `continueDisabled: boolean`, `finishDisabled: boolean`, `finishLoading`; outputs `stepSelected`, `next`, `back`, `cancel`, `finish`. `isLast = currentIndex === steps.length - 1` (el shell muestra "Agendar visita"/finish solo en el último paso; "Continuar" en el resto). `FormStep` = `{ key, title, subtitle }`.
- `PatientService` (`@features/pacientes/services/patient.service`): `getById(id: number): Observable<Patient>` — devuelve el `Patient` COMPLETO con `addresses: Address[]`.
- `Patient` / `Address` (`@features/pacientes/models/patient.model`): `Address = { id?, city?, province?, street?, streetNumber?, apartment?, neighborhood?, zipCode?, isPrimary, active }`. `Patient` tiene `addresses: Address[]`, `id`, `firstName`, `lastName`, `dni`.
- `patient-form.page.ts` YA tiene: `readonly returnTo = input<string|undefined>()`, `readonly dni = input<string|undefined>()` (bindeados por query param vía component-input-binding), precarga de DNI por query param, y en el success del alta (`ofType(addPatientSuccess, updatePatientSuccess)`) navega a `returnTo` (líneas ~287-292). `addPatientSuccess` trae `{ patient: Patient }`.
- El app usa `withComponentInputBinding()` (por eso `patient-form` lee query params como `input()`), así que `nueva-visita` puede leer `patientId` como `input()`.
- Estado actual de `nueva-visita.page.ts`: form con `scheduledAt/timeWindowStart/End/addressStreet/Number/City/References/comments`; `formValue = toSignal(form.valueChanges)`; `step0Valid`/`step1Valid` (reactivos); `onPatientSelected(p)` set `selectedPatient`; extractor autocomplete (fix `[object Object]` con tipo `ExtractorOption` ya aplicado); `lab-analysis-picker`; `onFinish()`→`submit()` arma payload y despacha `createHomeVisit`.

## File Structure

- **Modificar** `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts` (el grueso: 4 pasos, precarga, banner, preselección).
- **Modificar** `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts` (tests nuevos).
- **Modificar** `src/app/features/pacientes/pages/patient-form/patient-form.page.ts` (append `patientId` al redirect de `returnTo`).
- **Modificar** `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts` (test del append).

---

### Task 1: Wizard de 4 pasos (estructura + navegación + resumen)

**Files:**
- Modify: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts`
- Test: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts`

**Interfaces:**
- Produces: `STEPS` (4 pasos), `step2Valid` (computed, siempre true), `continueDisabledForStep()` (computed boolean para el paso actual), `next()` generalizado, `resumen` en P4.

- [ ] **Step 1: Escribir tests de navegación 4 pasos (fallan).** En `nueva-visita.page.spec.ts`, agregar:

```ts
it('STEPS tiene 4 pasos con las claves correctas', () => {
  const { component } = setup();
  const steps = (component as any).STEPS as readonly { key: string }[];
  expect(steps.map((s) => s.key)).toEqual(['paciente', 'direccion', 'analisis', 'resumen']);
});

it('step2Valid es siempre true (análisis y comentarios opcionales)', () => {
  const { component } = setup();
  expect(component.step2Valid()).toBe(true);
});

it('next() avanza de a un paso solo si el paso actual es válido', () => {
  const { component } = setup();
  component.next();                       // paso 0 inválido (sin paciente) -> no avanza
  expect(component.currentIndex()).toBe(0);
  component.onPatientSelected(MOCK_PATIENT);
  component.form.patchValue({ scheduledAt: new Date(), timeWindowStart: '08:00', timeWindowEnd: '10:00' });
  component.next();                       // paso 0 válido -> avanza a 1
  expect(component.currentIndex()).toBe(1);
  component.form.patchValue({ addressStreet: 'Av 7', addressCity: 'La Plata' });
  component.next();                       // paso 1 válido -> 2
  expect(component.currentIndex()).toBe(2);
  component.next();                       // paso 2 siempre válido -> 3 (resumen)
  expect(component.currentIndex()).toBe(3);
});
```

- [ ] **Step 2: Correr → FAIL.** `npm run test -- --include='**/nueva-visita.page.spec.ts'` (falla: STEPS tiene 2, `step2Valid` no existe).

- [ ] **Step 3: Implementar la estructura de 4 pasos.** En `nueva-visita.page.ts`:

3a. `STEPS` a 4 entradas:
```ts
const STEPS: readonly FormStep[] = [
  { key: 'paciente',  title: 'Paciente y horario',   subtitle: 'Identificación del paciente, fecha y ventana horaria' },
  { key: 'direccion', title: 'Dirección y extractor', subtitle: 'Dirección de la visita y extractor asignado' },
  { key: 'analisis',  title: 'Análisis y comentarios', subtitle: 'Determinaciones a realizar y comentarios' },
  { key: 'resumen',   title: 'Confirmación',          subtitle: 'Revisá los datos antes de agendar' },
];
```

3b. Agregar `step2Valid` (siempre válido) y el `continueDisabled` por paso:
```ts
/** Paso 2 (análisis + comentarios): todo opcional. */
readonly step2Valid = computed(() => true);

/** continueDisabled del wizard-shell según el paso actual. */
readonly continueDisabledForStep = computed(() => {
  switch (this.currentIndex()) {
    case 0: return !this.step0Valid();
    case 1: return !this.step1Valid();
    default: return false; // paso 2 (análisis) siempre permite avanzar al resumen
  }
});
```

3c. En el `<ui-wizard-shell>`, cambiar el binding de continue y dejar finish para el último paso:
```html
[continueDisabled]="continueDisabledForStep()"
[finishDisabled]="!(step0Valid() && step1Valid()) || pending()"
```
(el shell ya muestra finish solo en `isLast` = paso 3; continue en 0-2).

3d. Generalizar `next()`:
```ts
next(): void {
  this.step0Touched.set(true);
  if (this.continueDisabledForStep()) return;
  const next = Math.min(this.currentIndex() + 1, STEPS.length - 1);
  this.visited.update((s) => new Set([...s, next]));
  this.currentIndex.set(next);
}
```

3e. Reacomodar el template en 4 bloques `@if (currentIndex() === N)`:
- **idx 0** (`@if currentIndex()===0`): igual que hoy (paciente + fecha + ventana horaria).
- **idx 1**: mover acá la Dirección (calle/número/ciudad/referencias) **y** el Extractor. QUITAR de acá el bloque de análisis + comentarios.
- **idx 2**: el bloque de `lab-analysis-picker` + el `textarea` de comentarios (movidos desde el viejo paso 1).
- **idx 3** (resumen): bloque read-only nuevo (ver 3f).

3f. Bloque de resumen (idx 3), read-only, con los datos ya cargados:
```html
@if (currentIndex() === 3) {
  <div class="nv-section nv-summary">
    <div class="nv-sum-row"><span>Paciente</span>
      <strong>{{ selectedPatient()?.lastName }}, {{ selectedPatient()?.firstName }}</strong>
      <span class="nv-hint">DNI {{ selectedPatient()?.dni }}</span>
    </div>
    <div class="nv-sum-row"><span>Fecha y horario</span>
      <strong>{{ form.controls.scheduledAt.value | date:'dd/MM/yyyy' }}</strong>
      <span>{{ form.controls.timeWindowStart.value }} – {{ form.controls.timeWindowEnd.value }}</span>
    </div>
    <div class="nv-sum-row"><span>Dirección</span>
      <strong>{{ form.controls.addressStreet.value }} {{ form.controls.addressNumber.value }}</strong>
      <span>{{ form.controls.addressCity.value }}</span>
      @if (form.controls.addressReferences.value) { <span class="nv-hint">{{ form.controls.addressReferences.value }}</span> }
    </div>
    <div class="nv-sum-row"><span>Extractor</span>
      <strong>{{ selectedExtractor() ? (selectedExtractor()!.lastName + ', ' + selectedExtractor()!.firstName) : 'Sin asignar' }}</strong>
    </div>
    <div class="nv-sum-row"><span>Análisis</span>
      <strong>{{ analysesCount() > 0 ? (analysesCount() + ' determinación(es)') : 'Ninguno' }}</strong>
    </div>
    @if (form.controls.comments.value) {
      <div class="nv-sum-row"><span>Comentarios</span><span>{{ form.controls.comments.value }}</span></div>
    }
  </div>
}
```
Agregar `readonly analysesCount = signal(0)` y actualizarlo en `onAnalysisAdded`/`onAnalysisRemoved` (`this.analysesCount.set(this.selectedAnalyses.length)`), o un `computed` sobre un signal de análisis. Agregar estilos `.nv-summary`/`.nv-sum-row` (flex, gap, `--space-*`, `--ds-text-muted`) al bloque `styles`.
Necesita `DatePipe` en `imports` del componente (`import { DatePipe } from '@angular/common'`).

- [ ] **Step 4: Correr → PASS.** `npm run test -- --include='**/nueva-visita.page.spec.ts'` (los 3 nuevos + los existentes de KAN-184 verdes). Correr `npx tsc --noEmit -p tsconfig.app.json` → limpio.

- [ ] **Step 5: Commit.**
```bash
git add src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts
git commit -m "feat(domicilio): wizard de nueva visita en 4 pasos (dirección/extractor, análisis/comentarios, resumen)"
```

---

### Task 2: Precarga de dirección del paciente

**Files:**
- Modify: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts`
- Test: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts`

**Interfaces:**
- Consumes: `PatientService.getById`.
- Produces: `prefillPatientName` signal, `prefilledSnapshot` signal, `onPatientSelected` que precarga la dirección primaria.

- [ ] **Step 1: Test de precarga (falla).**
```ts
it('al seleccionar un paciente con dirección primaria, precarga calle/número/ciudad', () => {
  const { component } = setup();
  patientServiceMock.getById.mockReturnValue(of({
    ...MOCK_PATIENT,
    addresses: [{ street: 'Calle 50', streetNumber: '1234', city: 'La Plata', isPrimary: true, active: true }],
  }));
  component.onPatientSelected(MOCK_PATIENT);
  expect(patientServiceMock.getById).toHaveBeenCalledWith(MOCK_PATIENT.id);
  expect(component.form.controls.addressStreet.value).toBe('Calle 50');
  expect(component.form.controls.addressNumber.value).toBe('1234');
  expect(component.form.controls.addressCity.value).toBe('La Plata');
  expect(component.prefillPatientName()).toContain('García'); // apellido del MOCK_PATIENT
});

it('paciente sin dirección primaria: no precarga y limpia la dirección previa', () => {
  const { component } = setup();
  component.form.patchValue({ addressStreet: 'vieja', addressCity: 'vieja' });
  patientServiceMock.getById.mockReturnValue(of({ ...MOCK_PATIENT, addresses: [] }));
  component.onPatientSelected(MOCK_PATIENT);
  expect(component.form.controls.addressStreet.value).toBe('');
  expect(component.prefillPatientName()).toBeNull();
});
```
Agregar al `setup()` un `patientServiceMock = { getById: vi.fn().mockReturnValue(of(MOCK_PATIENT)) }` provisto como `{ provide: PatientService, useValue: patientServiceMock }` (seguir el patrón de mocks del spec existente).

- [ ] **Step 2: Correr → FAIL** (`prefillPatientName` no existe; `getById` no se llama).

- [ ] **Step 3: Implementar.** En `nueva-visita.page.ts`:
```ts
import { PatientService } from '@features/pacientes/services/patient.service';
import { Address } from '@features/pacientes/models/patient.model';
// ...
private readonly patientService = inject(PatientService);

readonly prefillPatientName = signal<string | null>(null);
private readonly prefilledSnapshot = signal<{ street: string; number: string; city: string; references: string } | null>(null);

onPatientSelected(p: Patient): void {
  this.selectedPatient.set(p);
  this.patientService.getById(p.id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (full) => this.applyPatientAddress(full),
      error: () => this.clearPrefill(), // sin dirección; el error de red no debe romper el wizard
    });
}

private applyPatientAddress(p: Patient): void {
  const addr: Address | undefined =
    p.addresses?.find((a) => a.isPrimary && a.active) ??
    p.addresses?.find((a) => a.active) ??
    p.addresses?.[0];
  if (!addr || !(addr.street || addr.city)) { this.clearPrefill(); return; }
  const references = [addr.apartment, addr.neighborhood].filter(Boolean).join(' · ');
  const snap = {
    street: addr.street ?? '', number: addr.streetNumber ?? '',
    city: addr.city ?? '', references,
  };
  this.form.patchValue({
    addressStreet: snap.street, addressNumber: snap.number,
    addressCity: snap.city, addressReferences: snap.references,
  });
  this.prefilledSnapshot.set(snap);
  this.prefillPatientName.set(`${p.lastName}, ${p.firstName}`);
}

private clearPrefill(): void {
  this.form.patchValue({ addressStreet: '', addressNumber: '', addressCity: '', addressReferences: '' });
  this.prefilledSnapshot.set(null);
  this.prefillPatientName.set(null);
}
```
Agregar `PatientService` a los mocks del `setup()` del spec si el `TestBed` no lo provee ya (el `pat-search-autocomplete` es un componente hijo standalone; el mock de `PatientService` debe estar en `providers`).

- [ ] **Step 4: Correr → PASS.** Spec + `tsc --noEmit` limpios.

- [ ] **Step 5: Commit.** `git commit -m "feat(domicilio): precarga la dirección primaria del paciente en el paso 2"`

---

### Task 3: Banner de dirección (prefilled → edited)

**Files:**
- Modify: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts`
- Test: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts`

**Interfaces:**
- Consumes: `prefilledSnapshot`, `formValue`.
- Produces: `addressSource` computed (`'none' | 'prefilled' | 'edited'`) + banner en el template (idx 1) y reflejo en el resumen (idx 3).

- [ ] **Step 1: Test del banner (falla).**
```ts
it('addressSource: none sin precarga; prefilled tras precargar; edited al modificar', () => {
  const { component } = setup();
  expect(component.addressSource()).toBe('none');
  patientServiceMock.getById.mockReturnValue(of({
    ...MOCK_PATIENT,
    addresses: [{ street: 'Calle 50', streetNumber: '1234', city: 'La Plata', isPrimary: true, active: true }],
  }));
  component.onPatientSelected(MOCK_PATIENT);
  expect(component.addressSource()).toBe('prefilled');
  component.form.controls.addressStreet.setValue('Otra calle');
  expect(component.addressSource()).toBe('edited');
});
```

- [ ] **Step 2: Correr → FAIL.**

- [ ] **Step 3: Implementar `addressSource`.**
```ts
readonly addressSource = computed<'none' | 'prefilled' | 'edited'>(() => {
  this.formValue(); // dependencia reactiva del form
  const snap = this.prefilledSnapshot();
  if (!snap) return 'none';
  const f = this.form.controls;
  const same =
    f.addressStreet.value === snap.street &&
    f.addressNumber.value === snap.number &&
    f.addressCity.value === snap.city &&
    f.addressReferences.value === snap.references;
  return same ? 'prefilled' : 'edited';
});
```
Banner en el bloque idx 1 (arriba de la dirección), inline, PrimeIcons, sin toast:
```html
@if (addressSource() === 'prefilled') {
  <div class="nv-banner nv-banner--info">
    <i class="pi pi-info-circle"></i>
    <span>Estás usando la dirección registrada de <strong>{{ prefillPatientName() }}</strong>. Podés modificarla para esta visita.</span>
  </div>
} @else if (addressSource() === 'edited') {
  <div class="nv-banner nv-banner--warn">
    <i class="pi pi-exclamation-triangle"></i>
    <span>Modificaste la dirección registrada — se usará solo para esta visita.</span>
  </div>
}
```
Estilos `.nv-banner` (flex, gap, padding, border-radius, tokens del design system): `--info` con `var(--ds-info-bg, #eff6ff)`/`var(--ds-info, #2563eb)`; `--warn` con tono ámbar (`#fffbeb`/`#b45309`). Reusar un componente de alert del design system si existe (buscar en `@shared/ui`); si no, este markup.
En el resumen (idx 3), agregar bajo Dirección una línea según `addressSource()`: `prefilled`→"Dirección registrada del paciente", `edited`→"Modificada para esta visita", `none`→(nada).

- [ ] **Step 4: Correr → PASS.** Spec + `tsc` limpios.

- [ ] **Step 5: Commit.** `git commit -m "feat(domicilio): banner de dirección registrada/modificada en el paso 2"`

---

### Task 4: Alta de paciente desde el wizard (redirect + preseleccionar)

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts:287-292`
- Test: `src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts`
- Modify: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts`
- Test: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts`

**Interfaces:**
- Consumes: `returnTo`/`addPatientSuccess.patient` (patient-form), `PatientService.getById` (nueva-visita).
- Produces: link "Darlo de alta" en idx 0; `patientId` input + preselección en nueva-visita; redirect de patient-form con `patientId`.

- [ ] **Step 1: Test del patient-form (falla).** En `patient-form.page.spec.ts`, agregar un test: con `returnTo='/domicilio/nueva'`, al emitir `addPatientSuccess({ patient: { id: 77, ... } })`, el router navega a `/domicilio/nueva?patientId=77`. (Seguir el patrón de spies del router del spec existente.)

- [ ] **Step 2: Correr → FAIL** (hoy navega a `/domicilio/nueva` sin `patientId`).

- [ ] **Step 3: Modificar el success handler de `patient-form`** (líneas ~287-292):
```ts
this.actions$
  .pipe(ofType(addPatientSuccess, updatePatientSuccess), takeUntilDestroyed())
  .subscribe((action) => {
    const target = this.returnTo();
    if (target && target.startsWith('/')) {
      // Devolvemos el id del paciente creado/actualizado para que el flujo de origen lo preseleccione.
      this.router.navigate([target], { queryParams: { patientId: action.patient.id } });
    } else {
      this.router.navigateByUrl('/pacientes');
    }
  });
```

- [ ] **Step 4: Correr → PASS** (patient-form spec).

- [ ] **Step 5: Test de preselección en nueva-visita (falla).**
```ts
it('con patientId en la ruta, preselecciona el paciente y precarga su dirección', () => {
  patientServiceMock.getById.mockReturnValue(of({
    ...MOCK_PATIENT, id: 77,
    addresses: [{ street: 'Calle 50', city: 'La Plata', isPrimary: true, active: true }],
  }));
  const { component } = setup({ patientId: '77' }); // el setup pasa el input patientId
  expect(patientServiceMock.getById).toHaveBeenCalledWith(77);
  expect(component.selectedPatient()?.id).toBe(77);
  expect(component.form.controls.addressStreet.value).toBe('Calle 50');
});
```
Ajustar `setup()` para aceptar inputs (setear `fixture.componentRef.setInput('patientId', ...)` antes de `detectChanges`).

- [ ] **Step 6: Correr → FAIL.**

- [ ] **Step 7: Implementar en nueva-visita.**
7a. Input + preselección (usar component-input-binding como `patient-form`):
```ts
readonly patientId = input<string | undefined>(undefined);
// en el constructor (o ngOnInit con effect):
constructor() {
  effect(() => {
    const id = this.patientId();
    if (!id) return;
    const numeric = Number(id);
    if (Number.isNaN(numeric)) return;
    this.patientService.getById(numeric)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.onPatientSelected(p)); // set + precarga (Task 2)
  });
}
```
(Si el componente no tenía constructor, agregarlo; `effect` requiere injection context — el field initializer del constructor lo provee.)

7b. Link "Darlo de alta" en idx 0, debajo del buscador de paciente:
```html
<a class="nv-link" (click)="goToAltaPaciente()" role="button" tabindex="0">
  ¿No está registrado? Darlo de alta
</a>
```
```ts
goToAltaPaciente(): void {
  this.router.navigate(['/pacientes/nuevo'], { queryParams: { returnTo: '/domicilio/nueva' } });
}
```
Estilo `.nv-link` (color `--brand-primary`, cursor pointer, font-size 13px).

- [ ] **Step 8: Correr → PASS** (nueva-visita spec) + `tsc --noEmit` limpio en ambos.

- [ ] **Step 9: Commit.**
```bash
git add src/app/features/pacientes/pages/patient-form/patient-form.page.ts src/app/features/pacientes/pages/patient-form/patient-form.page.spec.ts src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.spec.ts
git commit -m "feat(domicilio): alta de paciente desde el wizard (redirect + volver preseleccionado)"
```

---

### Task 5: Verificación integral

- [ ] **Step 1: Suite del feature.** `npm run test -- --include='**/nueva-visita.page.spec.ts' --include='**/patient-form.page.spec.ts'` → verde. `npx tsc --noEmit -p tsconfig.app.json` → limpio.

- [ ] **Step 2: Build.** `npm run build` → "Application bundle generation complete" sin errores (los warnings de jsbarcode/canvg son pre-existentes ajenos).

- [ ] **Step 3: Smoke E2E en vivo** (BE dev con domicilio en :8080 + FE en :4200, login admin@test.com/password):
  1. `/domicilio/agenda` → "Nueva visita".
  2. **Paso 1:** buscar paciente con dirección guardada → seleccionar → avanzar. (También probar "Darlo de alta" → crea paciente → vuelve preseleccionado.)
  3. **Paso 2:** verificar dirección precargada + **banner prefilled**; modificar la calle → **banner edited**; seleccionar extractor (muestra "Apellido, Nombre", no `[object Object]`).
  4. **Paso 3:** agregar un análisis + comentario (opcional).
  5. **Paso 4:** resumen correcto → "Agendar visita" → `POST /api/v1/domicilio/visits 201` → aparece en la agenda.

- [ ] **Step 4: Commit** de ajustes y push. PR contra `development` (rama `fix/domicilio-route-redirect`; ya abierta como PR #135 — actualizar su body para incluir este rework, o abrir PR aparte si se prefiere aislar el feature de los fixes).

## Self-Review (completado)

- **Spec coverage:** 4 pasos + validez + resumen (Task 1); precarga cualquier paciente con dirección (Task 2); banner prefilled→edited + reflejo en resumen (Task 3); alta paciente redirect+preselect reusando `returnTo` existente (Task 4); tests + build + E2E (Task 5). ✔
- **Placeholders:** el `Jira: pendiente` se resuelve en jira-workflow; los "buscar componente de alert en @shared/ui si existe" traen el fallback concreto (markup propio) — no son TODOs abiertos. ✔
- **Type consistency:** `step0Valid`/`step1Valid` conservados (no rompen KAN-184), `step2Valid`/`continueDisabledForStep`/`addressSource`/`prefilledSnapshot`/`prefillPatientName`/`patientId` consistentes entre Tasks 1-4. `PatientService.getById(number)` y `Address` con los campos reales (`streetNumber`, no `number`). ✔
