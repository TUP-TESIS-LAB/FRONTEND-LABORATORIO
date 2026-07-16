---
name: laboratory-ui-stepper
description: >
  Guía obligatoria para cualquier wizard o formulario multi-paso en el laboratorio.
  Usar SIEMPRE que se necesite crear un stepper, wizard, formulario de alta multi-paso,
  o se mencionen palabras como "pasos", "wizard", "stepper", "nuevo paciente", "nueva
  sucursal", "nuevo turno", "registro de atención" o cualquier flujo de creación/edición
  compleja. NUNCA crear un header de stepper propio — toda navegación de pasos pasa por
  ui-form-stepper-header.
---

# ui-form-stepper-header — Estándar de steppers del laboratorio

## Regla fundamental

**NUNCA crear un header de stepper propio.** Toda navegación de pasos usa
`FormStepperHeaderComponent` (`ui-form-stepper-header`).

```
✅  <ui-form-stepper-header [steps]="steps" [currentIndex]="current" [visited]="visited" />
❌  <div class="mi-stepper-custom">...</div>
```

Vive en `src/app/shared/ui/components/form-stepper-header/`.
El modelo en `src/app/shared/ui/models/form-step.ts`.

---

## Imports requeridos

```typescript
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';
```

---

## API del componente

| Input          | Tipo                    | Descripción                                                      |
|----------------|-------------------------|------------------------------------------------------------------|
| `steps`        | `readonly FormStep[]`   | **Requerido.** Definición de todos los pasos                     |
| `currentIndex` | `number`                | **Requerido.** Índice del paso actualmente activo (0-based)      |
| `visited`      | `ReadonlySet<number>`   | **Requerido.** Set de índices ya visitados (habilita navegación) |
| `clickable`    | `boolean`               | Default `true`. En `false`: indicador de progreso read-only (sin navegación libre) |

| Output         | Tipo     | Cuándo se emite                          |
|----------------|----------|------------------------------------------|
| `stepSelected` | `number` | Usuario hace click en un paso visitado   |

## Modelo FormStep

```typescript
interface FormStep<K extends string = string> {
  readonly key: K;
  readonly title: string;
  readonly subtitle?: string;
}
```

---

## Los 4 estándares del stepper del laboratorio

Estos patrones aplican a **todos** los steppers del portal administrativo, sin excepción.

### 1. Sin títulos redundantes en el contenido del paso

El título del paso vive en el header (`step.title`). El cuerpo del paso **no repite** el
título como `<h2>` o `<h3>`. Solo se permite un hint contextual chico si agrega valor.

```html
<!-- ❌ Mal -->
<div class="step-body">
  <h2>Datos del paciente</h2>
  <p>Completá los datos del paciente...</p>
  ...
</div>

<!-- ✅ Bien -->
<div class="step-body">
  <p class="step-hint">Completá los datos del paciente.</p>
  ...
</div>
```

### 2. Obligatorios: `*` rojo en el label + borde rojo global al perder foco

Los campos requeridos llevan un asterisco rojo en el label con la clase `.pat-form__req`:

```html
<label for="lastName">
  Apellido <span class="pat-form__req" aria-hidden="true">*</span>
</label>
<input pInputText id="lastName" formControlName="lastName" />
```

El borde rojo al perder el foco (`.ng-touched.ng-invalid`) es una **regla CSS global**
definida en `styles/globals.scss`. **No agregar estilos de error inline** en los
componentes — la regla global lo maneja sola.

### 3. Listas repetibles = filas planas compactas

Cuando un paso tiene una lista editable (coberturas, contactos, horarios, etc.):
- Botón "Agregar" alineado **arriba** (no abajo de la lista)
- Inputs en fila compacta horizontal
- Botón trash **inline** a la altura del input (no como acción separada al pie)
- Sin cards ni acordeones para items simples

```html
<div class="pat-form__repeatable-header">
  <span>Coberturas</span>
  <p-button icon="pi pi-plus" label="Agregar" size="small" (onClick)="add()" />
</div>

@for (fg of array.controls; track $index) {
  <div class="pat-form__row" [formGroup]="fg">
    <p-select formControlName="planId" [options]="plans" optionLabel="label" optionValue="planId" />
    <p-button icon="pi pi-trash" severity="danger" text (onClick)="remove($index)" />
  </div>
}
```

### 4. Sin placeholders en los inputs del stepper

Los inputs del stepper **no tienen texto placeholder**. Si se necesita orientar al usuario,
usar un helper text debajo del campo o el subtitle del step.

```html
❌ <input pInputText placeholder="Ej: García" formControlName="lastName" />
✅ <input pInputText formControlName="lastName" />
```

---

## Estructura mínima de un wizard full-page

```typescript
@Component({
  selector: 'feat-alta-wizard',
  standalone: true,
  imports: [FormStepperHeaderComponent, ReactiveFormsModule, /* steps... */],
  template: `
    <div class="wizard-shell">
      <ui-form-stepper-header
        [steps]="STEPS"
        [currentIndex]="currentIndex()"
        [visited]="visited()"
        (stepSelected)="goTo($event)" />

      <div class="wizard-body">
        @switch (currentIndex()) {
          @case (0) { <feat-step-datos-generales [form]="form.controls.general" /> }
          @case (1) { <feat-step-coberturas      [array]="form.controls.coberturas" /> }
          @case (2) { <feat-step-resumen         [form]="form.getRawValue()" /> }
        }
      </div>

      <footer class="wizard-footer">
        <p-button label="Volver"    severity="secondary" (onClick)="prev()" [disabled]="currentIndex() === 0" />
        <p-button [label]="isLast() ? 'Confirmar' : 'Continuar'"
                  (onClick)="next()"
                  [disabled]="!currentStepValid()" />
      </footer>
    </div>
  `,
})
export class AltaWizardComponent {
  readonly STEPS: FormStep[] = [
    { key: 'general',   title: 'Datos generales',  subtitle: 'Nombre y documento' },
    { key: 'cobertura', title: 'Cobertura',         subtitle: 'Obra social' },
    { key: 'resumen',   title: 'Resumen',           subtitle: 'Confirmar alta' },
  ];

  readonly currentIndex = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  goTo(i: number): void { this.currentIndex.set(i); }

  next(): void {
    const next = this.currentIndex() + 1;
    this.visited.update((s) => new Set([...s, next]));
    this.currentIndex.set(next);
  }

  prev(): void { this.currentIndex.update((i) => i - 1); }

  isLast(): boolean { return this.currentIndex() === this.STEPS.length - 1; }
}
```

---

## Modo read-only (wizard dirigido por máquina de estados)

Para wizards donde el avance lo controla la app (no el usuario navegando libre),
usar `[clickable]="false"`. El header muestra el progreso pero no permite volver atrás:

```html
<ui-form-stepper-header
  [steps]="STEPS"
  [currentIndex]="currentIndex()"
  [visited]="visited()"
  [clickable]="false" />
```

Útil en: flujo de atención médica, registro de extracción, check-in de tótem.

---

## Cuándo usar stepper vs drawer

| Criterio | Stepper full-page | Drawer lateral |
|---|---|---|
| Payload | Aggregate con arrays anidados | Objeto plano / ficha simple |
| Operación | Transacción de negocio compleja | Alta/edición de una entidad atómica |
| Ejemplos | Alta paciente, registro atención, nuevo turno | Médico derivante, usuario, obra social |
| Endpoint | `POST /evento` con colecciones | `POST /entidad` con body simple |

---

## Anti-patrones

```
❌ Header de stepper custom (div con círculos numerados hecho a mano)
❌ Título grande (<h2>) repitiendo el nombre del paso en el cuerpo del step
❌ Placeholder en inputs del stepper (usa helper text o step subtitle)
❌ Botón "Agregar ítem" al pie de la lista repetible (va arriba)
❌ Cards o acordeones para ítems simples de una lista repetible (filas planas)
❌ [clickable]="true" en un wizard dirigido por máquina de estados
```
