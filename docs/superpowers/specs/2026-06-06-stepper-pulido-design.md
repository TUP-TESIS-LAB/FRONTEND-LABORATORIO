# Stepper estándar — pulido de contenido (referencia: stepper de pacientes)

**Fecha:** 2026-06-06
**Rama:** `feat/ui-tabla-stepper-estandar`
**Estado:** diseño aprobado

## Contexto

El sistema ya tiene un stepper genérico (`ui-form-stepper-header`, `@shared/ui/components/form-stepper-header`) usado por 5 pantallas (agenda, alta de sucursal, paciente, empleado, médico). El **header del stepper está bien**; lo que rompe la prolijidad es el **contenido de cada paso**. Este spec define 3 patrones estándar de contenido de pasos y los aplica al **stepper de pacientes** como referencia. Luego se propagan al resto.

Fuera de alcance de este incremento (van en incrementos siguientes): propagar los patrones a empleado/médico/sucursal/agenda; migrar los 3 steppers propios (obra social, tenant SaaS, atención wizard) al header compartido; el sub-proyecto de **Tabla genérica**.

## Patrones estándar

### 1. Sin títulos redundantes en el contenido del paso
El título y subtítulo del paso ya los muestra `ui-form-stepper-header`. El contenido del paso **no** debe repetirlos con un `<h1>/<h2>`.
- Se eliminan los títulos in-content (ej. "Dirección · opcional", "Coberturas · opcional", "Resumen").
- La **guía contextual** ("Podés saltarlo y registrarlo igual.", "Si no agregás ninguna, el paciente queda como particular.") se conserva como una **línea muted chica** (`text-sm text-surface-500`) al inicio del paso, sin jerarquía de título.
- Pacientes: aplicar a `direccion`/`address`, `coberturas`/`coverages`, `resumen`/`summary`. El paso "Datos generales" ya cumple (no tiene título redundante).

### 2. Campos obligatorios: indicador `*` + rojo al blur
- El label de un campo requerido lleva un `*` en color danger (`var(--ds-danger)`).
- El control muestra **borde rojo al perder foco (blur)** si quedó vacío/ inválido.
- **Implementación global**: regla SCSS sobre los controles con clases `.ng-touched.ng-invalid` (Angular agrega `ng-touched` al blur y `ng-invalid` cuando es inválido). Cubre `input`/`textarea` nativos + componentes PrimeNG (`p-inputtext`, `p-select`, `p-datepicker`, `p-inputnumber`). Al ser global, aplica a **todo el sistema** sin tocar cada formulario.
- Selectores exactos de PrimeNG se ajustan en implementación (inspeccionando el DOM de cada control). No se usa `!important` salvo que la especificidad de PrimeNG lo exija.

### 3. Listas repetibles: filas planas con divisor (sin cards)
Las listas repetibles (Otros contactos, Coberturas, etc.) hoy son una **card por ítem**, lo que rompe contra los inputs planos del resto del form. Se reemplaza por un patrón plano estándar:
- Contenedor `form-repeat` con filas `form-repeat__row`.
- Cada fila: los campos **directo sobre el fondo del form** (misma densidad que los inputs de arriba), separadas entre sí por un **divisor fino** (`border-top`), con un botón **Quitar** (ícono, a la derecha).
- Header de la lista: nombre + contador + botón "+ Agregar".
- Pacientes: aplicar a "Otros contactos" y "Coberturas".

## Arquitectura / dónde cambia

- **Patrón 2** → SCSS global (en `src/styles/` o `globals.scss`), 0 cambios por-form. Más, opcionalmente, normalizar el `*` de labels requeridos.
- **Patrón 1** → edición de los step-components de pacientes (sacar título, dejar hint).
- **Patrón 3** → CSS del patrón `form-repeat` (en estilos compartidos o por componente) + reflow del markup de los editores repetibles de pacientes (contactos, coberturas). Si conviene, extraer la fila repetible a un patrón reutilizable.

## Testing
- Specs de componente (`ng test` / Vitest) para los step-components tocados (que rendericen sin el título, que el patrón repetible agregue/quite filas).
- El SCSS global (patrón 2) es visual → se valida corriendo la app (no test unitario).

## Refinamientos de la iteración visual (verificados en vivo)
Al validar el stepper de pacientes en la app se ajustó el patrón de listas repetibles y se sumó uno nuevo:
- **Listas repetibles compactas**: el botón **"+ Agregar X" va arriba, alineado en la misma línea que el label de la lista** (ej. "Otros contactos … + Agregar contacto"), no abajo. El **trash va inline, a la misma altura que los inputs** (no en una fila propia). Padding de fila mínimo (`.pat-form__row` con `padding: var(--space-2) 0`, `gap: 4px`). Filas separadas por divisor fino.
- **Sin placeholders en inputs** (nuevo patrón estándar): ningún campo de formulario lleva `placeholder` (ni inputs de texto, ni datepicker, ni selects). Los campos vacíos quedan en blanco; los obligatorios se marcan con el `*` rojo + borde rojo al blur. (Los buscadores de listados — search boxes — son otro contexto y quedan fuera.)

## Criterio de hecho (este incremento)
- Stepper de pacientes: pasos sin títulos redundantes; obligatorios con `*` + rojo-al-blur (global); listas repetibles como filas planas con divisor.
- Specs verdes.
- Los 3 patrones quedan documentados acá como **estándar del sistema** para los próximos steppers.
