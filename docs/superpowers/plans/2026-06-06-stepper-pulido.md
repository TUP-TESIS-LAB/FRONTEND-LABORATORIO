# Pulido de stepper (ref. pacientes) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps usan checkbox `- [ ]`.

**Goal:** Aplicar los 3 patrones estándar (sin títulos redundantes, obligatorios `*`+rojo-al-blur, filas repetibles planas) al stepper de pacientes como referencia del sistema.

**Architecture:** Patrón 2 = una regla SCSS global (cero cambios por-form). Patrón 1 = sacar `<h2 pat-step__title>` de los step-components. Patrón 3 = reescribir el estilo global `.pat-form__row` (card → plano con divisor) + sacar el header "#N" de los editores repetibles. Todo FE, worktree `feat/ui-tabla-stepper-estandar`.

**Tech Stack:** Angular 21 standalone + PrimeNG 21 + SCSS (`src/styles/`), Vitest (`ng test`).

---

## File Structure
- `src/styles/utilities.scss` — (mod) regla global required + reescribir `.pat-form__row` a plano/divisor.
- `src/app/features/pacientes/pages/patient-form/steps/address-step/address-step.component.ts` — (mod) sacar título.
- `.../steps/coverages-step/coverages-step.component.ts` — (mod) sacar título.
- `.../steps/summary-step/summary-step.component.ts` — (mod) sacar título.
- `src/app/features/pacientes/components/contact-section/contact-section.component.ts` — (mod) header sin "#N".
- `src/app/features/pacientes/components/coverage-section/coverage-section.component.ts` — (mod) header sin "#N".
- Specs afectados: `coverages-step.component.spec.ts`, `general-step.component.spec.ts`, `patient-form.page.spec.ts` — (verificar/ajustar si asertan textos de título).

---

### Task 1: Patrón 2 — obligatorios (rojo al blur, global)

**Files:** Modify `src/styles/utilities.scss`

- [ ] **Step 1: Agregar la regla global al final de utilities.scss**

```scss
/* Required-field feedback: borde danger cuando el control fue tocado (blur) y es inválido.
   Angular agrega .ng-touched al perder foco y .ng-invalid si falla la validación. */
input.ng-touched.ng-invalid,
textarea.ng-touched.ng-invalid,
select.ng-touched.ng-invalid,
.p-inputtext.ng-touched.ng-invalid,
.p-select.ng-touched.ng-invalid,
.p-datepicker.ng-touched.ng-invalid .p-inputtext,
.p-inputnumber.ng-touched.ng-invalid .p-inputtext,
.p-inputtext.ng-touched.ng-invalid input {
  border-color: var(--ds-danger);
}
```

- [ ] **Step 2: Verificar selectores reales de PrimeNG** — inspeccionar en la app corriendo un `p-select` y un `p-datepicker` inválidos+touched; ajustar selectores si la clase `.ng-invalid.ng-touched` cae en otro nodo. (PrimeNG 21 suele ponerla en el host del control.)
- [ ] **Step 3: Commit** `style: borde rojo al blur en campos requeridos invalidos (global)`

---

### Task 2: Patrón 1 — sacar títulos redundantes de los pasos

**Files:** Modify address-step, coverages-step, summary-step (.component.ts)

- [ ] **Step 1: address-step** — borrar la línea `<h2 class="pat-step__title">Dirección <span class="pat-step__opt">· opcional</span></h2>`. Mantener el `<p class="pat-step__hint">`.
- [ ] **Step 2: coverages-step** — borrar la línea `<h2 class="pat-step__title">Coberturas ...</h2>`. Mantener el hint.
- [ ] **Step 3: summary-step** — borrar la línea `<h2 class="pat-step__title">Resumen</h2>`. Mantener el hint.
- [ ] **Step 4: general-step** — leer `general-step.component.ts`; si tiene un `pat-step__title` redundante, sacarlo (el screenshot sugiere que NO lo tiene). Si no, no tocar.
- [ ] **Step 5: Correr specs** `npx ng test --watch=false --include="src/app/features/pacientes/pages/patient-form/**/*.spec.ts"`. Si algún spec aserta el texto del título (ej. busca "Resumen"/"Dirección"), actualizarlo para no depender del título.
- [ ] **Step 6: Commit** `feat: pasos del stepper de pacientes sin titulo redundante (vive en el header)`

---

### Task 3: Patrón 3 — filas repetibles planas con divisor

**Files:** Modify `src/styles/utilities.scss`, contact-section, coverage-section

- [ ] **Step 1: Reescribir `.pat-form__row` en utilities.scss** (de card a plano + divisor):

```scss
// Row item inside a repeatable list (contact / address / coverage) — flat + divider.
.pat-form__row {
  padding: var(--space-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.pat-form__row + .pat-form__row {
  border-top: 1px solid var(--ds-border, #e5e7eb);
}
```

- [ ] **Step 2: contact-section** — en `pat-form__row-header`, borrar el `<strong style="font-size:12px">Contacto #{{ i + 1 }}</strong>` (dejar solo el `p-button` del trash). Para que el trash quede a la derecha sin el strong, cambiar el contenedor a `class="flex justify-end"` (o agregar `style="justify-content:flex-end"`).
- [ ] **Step 3: coverage-section** — idem: borrar `<strong>Cobertura #{{ i + 1 }}</strong>`, trash a la derecha.
- [ ] **Step 4: Verificar en la app** — el step General (Otros contactos) y Coberturas muestran filas planas separadas por línea, sin card, con el trash a la derecha; densidad consistente con los inputs de arriba.
- [ ] **Step 5: Commit** `feat: listas repetibles del stepper de pacientes como filas planas con divisor`

---

### Task 4: Verificación final

- [ ] **Step 1:** Correr toda la suite de pacientes: `npx ng test --watch=false --include="src/app/features/pacientes/**/*.spec.ts"`. Esperado: verde.
- [ ] **Step 2:** Levantar la app y revisar visualmente el stepper de paciente (los 4 pasos): sin títulos redundantes, obligatorios con rojo-al-blur, filas planas. Ajustar detalles si hace falta.

---

## Self-review
- **Cobertura del spec:** Patrón 1 → Task 2; Patrón 2 → Task 1; Patrón 3 → Task 3; verificación → Task 4. ✔
- **Placeholders:** los selectores PrimeNG exactos (Task 1 Step 2) y el chequeo de general-step (Task 2 Step 4) son verificaciones explícitas contra el DOM real, no huecos. El `*` rojo en labels: en pacientes los labels usan `.pat-form__label` (11px muted); si el form ya marca obligatorios con `*` se respeta; si no, se agrega un `*` (var(--ds-danger)) en los labels requeridos del general-step durante Task 2. ✔
- **Consistencia de tipos:** clases `.pat-form__row`, `.pat-step__title`, `.pat-step__hint`, `--ds-danger`, `--ds-border` coinciden con utilities.scss/tokens.scss. ✔
