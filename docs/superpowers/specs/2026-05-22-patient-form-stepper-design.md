# Patient Form Stepper — Design

> **Estado:** aprobado en brainstorm 2026-05-22
> **Mockup:** [docs/superpowers/specs/2026-05-22-patient-form-stepper-mockup.html](./2026-05-22-patient-form-stepper-mockup.html)
> **Archivo a reemplazar:** `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`

## Motivación

La pantalla actual de carga de paciente (`patient-form.page.ts`) muestra las 4 secciones (Datos generales, Coberturas, Contactos, Direcciones) en un grid de 2 columnas dentro de una sola vista larga. Es funcional pero hostil en la primera carga: el operador no sabe por dónde empezar y los campos opcionales conviven visualmente con los obligatorios.

Rediseñar la pantalla a un stepper acota el foco a una decisión por paso, deja explícito qué es obligatorio y qué no, y permite registrar al paciente con datos mínimos sin renunciar al detalle.

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Shell visual | Stepper **horizontal arriba** (cards de pasos + connectors). |
| Pasos | **3 pasos**: ① Datos generales · ② Coberturas · ③ Contacto & Dirección. |
| Navegación | Lineal con botones **Continuar / Atrás**. Headers de pasos ya visitados son clickeables (volver). No se puede saltar adelante. |
| Obligatoriedad | Sólo el **paso 1** es obligatorio para registrar. Pasos 2 y 3 quedan opcionales (badge "opcional" visible). |
| Submit | El botón "Registrar paciente" aparece **sólo en el paso 3**. El Continuar del último paso se transforma en Registrar. No hay submit en pasos intermedios. |
| Modo edición | Mismo stepper, pero los 3 headers están "visitados" desde el inicio (navegación libre). Botón **"Guardar cambios"** visible en cualquier paso. |
| Atajos | `Ctrl+→` avanza, `Ctrl+←` retrocede, `Ctrl+S` guarda (en último paso de alta, o en cualquier paso de edición), `Esc` vuelve atrás con confirm dialog si hay cambios. |
| Persistencia local | Fuera de scope para esta iteración (no borrador local). El form vive en memoria hasta navegar afuera. |

## Estructura de pasos

### Paso 1 — Datos generales (obligatorio)

Mismos campos que la sección actual `general`:
- `lastName` (required)
- `firstName` (required)
- `dni` (required, `^\d{7,}$`, con check de duplicado vía `checkPatientDni`)
- `birthDate` (required)
- `gender` (opcional)
- `sexAtBirth` (opcional)

**Validación de paso:** subgrupo `general` debe ser `VALID` y `dniDuplicate()` debe ser `false`. Si no, "Continuar" queda deshabilitado.

En **edición**, `dni` queda `disabled` (igual que hoy).

### Paso 2 — Coberturas (opcional)

`FormArray` de coberturas. Reusa el componente actual `CoverageSectionComponent`.

**Validación de paso:** ninguna a nivel paso. Las filas individuales mantienen sus validators. Se puede continuar con array vacío.

### Paso 3 — Contacto & Dirección (opcional)

Dos sub-secciones dentro del mismo paso, separadas con subtítulos:
- **Contactos** — reusa `ContactSectionComponent` con el `FormArray` actual.
- **Direcciones** — reusa `AddressSectionComponent` con el `FormArray` actual.

**Validación de paso:** ninguna.

## Arquitectura propuesta

Romper la página gigante en piezas con responsabilidad acotada:

```
features/pacientes/pages/patient-form/
├── patient-form.page.ts            (shell del stepper: header, footer, store glue)
├── patient-form.page.spec.ts
├── steps/
│   ├── patient-form-steps.ts       (constante con definición de los 3 pasos)
│   ├── general-step/
│   │   ├── general-step.component.ts        (renderiza paso 1)
│   │   └── general-step.component.spec.ts
│   ├── coverages-step/
│   │   ├── coverages-step.component.ts
│   │   └── coverages-step.component.spec.ts
│   └── contact-address-step/
│       ├── contact-address-step.component.ts
│       └── contact-address-step.component.spec.ts
└── components/
    └── form-stepper-header/
        ├── form-stepper-header.component.ts (cards de pasos + connectors)
        └── form-stepper-header.component.spec.ts
```

**`patient-form.page.ts` (shell)** mantiene:
- El `FormGroup` raíz (mismo shape actual: `general` / `contacts` / `addresses` / `coverages`).
- Toda la integración NgRx (store dispatches, selectors, effects).
- El `currentStep` (signal `0..2`).
- El `visitedSteps` (signal `Set<number>`) — en modo edición arranca como `{0,1,2}`, en alta arranca como `{0}`.
- La lógica de submit y los atajos de teclado.

**`form-stepper-header`** es un componente puro presentacional:
- `@Input` `steps: StepDefinition[]`, `currentIndex: number`, `visited: Set<number>`, `valid: Set<number>`.
- `@Output` `stepSelected: number` (sólo emite si el header es clickeable).
- Renderiza los círculos numerados + labels + connectors según el mockup.

**`*-step.component`** son componentes presentacionales que reciben el sub-FormGroup/FormArray correspondiente como input. No conocen el store ni el shell.

### Definición de pasos

```ts
// patient-form-steps.ts
export interface StepDefinition {
  readonly key: 'general' | 'coverages' | 'contact-address';
  readonly title: string;
  readonly subtitle: string;
  readonly required: boolean;
}

export const PATIENT_FORM_STEPS: readonly StepDefinition[] = [
  { key: 'general', title: 'Datos generales', subtitle: 'Identidad del paciente', required: true },
  { key: 'coverages', title: 'Coberturas', subtitle: 'Obras sociales · opcional', required: false },
  { key: 'contact-address', title: 'Contacto & Dirección', subtitle: 'Cómo ubicarlo · opcional', required: false },
];
```

### Estado derivado en el shell (signals)

```ts
readonly currentStep = signal(0);
readonly visited = signal<ReadonlySet<number>>(new Set([0]));
readonly isLastStep = computed(() => this.currentStep() === PATIENT_FORM_STEPS.length - 1);
readonly isFirstStep = computed(() => this.currentStep() === 0);

// Paso 1 válido = subgrupo general VALID y no duplicado
readonly step0Valid = computed(() => {
  const g = this.form.get('general')!;
  return g.valid && !this.dniDuplicate();
});

// Para el botón Continuar
readonly canContinue = computed(() => {
  if (this.currentStep() === 0) return this.step0Valid();
  return true; // pasos 2 y 3 no validan paso
});

// Para Registrar/Guardar
readonly canSubmit = computed(() =>
  this.step0Valid() && !this.pending()
);
```

## Reglas de transición

- **Continuar (no es el último paso):** si `canContinue()`, `currentStep := currentStep + 1`, `visited.add(currentStep)`. Si no, marcar el subgrupo del paso actual como `touched` para mostrar errores.
- **Atrás:** `currentStep := currentStep - 1`.
- **Click en header de paso `i`:**
  - Si `i < currentStep` o `visited.has(i)`: salta a `i`.
  - Si `i > currentStep` y no visitado: no hace nada.
- **Submit (botón Registrar en paso 3 / Guardar en edición):** si `canSubmit()`, despacha `addPatient` o `updatePatient` (lógica idéntica a hoy).

## Compatibilidad con el flujo actual

- Mismo `FormGroup` raíz, mismos validators, mismos selectors NgRx, mismos `addPatient` / `updatePatient` / `checkPatientDni` / `loadPatient`. **No hay cambios en el store ni en el modelo.**
- Mismos componentes `ContactSectionComponent`, `AddressSectionComponent`, `CoverageSectionComponent`. Sólo cambia dónde se renderizan.
- Mismas rutas (`/pacientes/nuevo`, `/pacientes/:id/editar`). El `input('id')` se sigue resolviendo igual.
- Mismo confirm dialog en `onBack()` si el form está `dirty`.

## Estilos

PrimeNG no aporta un componente Stepper que matchee bien el diseño del mockup (su `p-steps` tiene otra estética). Implementar el `form-stepper-header` con **CSS propio** + clases utilitarias Tailwind, siguiendo el design system `laboratory-ui`. Los círculos numerados, connectors y estados (current/done/locked) son CSS plano sobre flexbox.

Estados visuales:
- **current**: círculo azul (`--primary`), label en bold azul.
- **done**: círculo verde con `✓` (`--success`), label en color de texto normal, **clickeable** (cursor pointer).
- **locked**: círculo con borde gris, label gris claro, no clickeable.

## Testing

- `patient-form.page.spec.ts`: smoke + transiciones (Continuar habilitado/deshabilitado según paso, paso 0 dispara checkDni, submit despacha la action correcta según alta/edición, edición arranca con todos los pasos visitados).
- `form-stepper-header.component.spec.ts`: emite `stepSelected` sólo para pasos visitados o anteriores; estados visuales reflejan props.
- `*-step.component.spec.ts`: render del subgrupo correcto, propagación de cambios al form.

## Fuera de scope

- Borrador local (localStorage / IndexedDB).
- Validación cruzada entre pasos (ej. "si hay cobertura primaria debe haber teléfono").
- Animaciones de transición entre pasos.
- Soporte mobile específico (la vista actual ya es desktop-first; el stepper sigue siendo desktop-first en esta iteración).
