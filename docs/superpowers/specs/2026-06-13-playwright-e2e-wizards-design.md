# Spec — Suite E2E Playwright (slice 1: wizards + validaciones)

> **Estado:** diseño aprobado 2026-06-13. Pendiente: plan + ticket Jira antes de implementar.
> **Jira:** [KAN-100](https://exequielsantoro.atlassian.net/browse/KAN-100)

## Objetivo

Montar el harness de Playwright (hoy inexistente en el repo) y escribir un primer
slice de tests E2E que valide la **UX y las validaciones de los wizards** del portal
administrativo — la superficie que acabamos de reworkear con `ui-wizard-shell` y el
fix del stepper. Sirve como red de regresión y como patrón a expandir a otras áreas.

## Contexto

- Front: Angular 21 + PrimeNG, dev server en `http://localhost:4200`.
- Back: Spring Boot en `http://localhost:8080`, seed local `admin@test.com` / `password`.
- DB local: MySQL en docker, volumen **descartable** (`laboratorio_mysql_data`).
- Hoy NO hay Playwright (ni deps, ni config, ni tests e2e). Runner de unit/component
  del proyecto es Vitest (`ng test`) — Playwright va aparte, no lo reemplaza.

## Decisiones (de la sesión de brainstorming)

1. **Alcance del slice 1:** los 6 wizards + sus validaciones. Fuera de alcance:
   flujos de atención/recepción/extracción end-to-end, smoke amplio de toda la app,
   tests de íconos. (Slices futuros.)
2. **Datos:** validación-first. La mayoría de los asserts son de validación pura sin
   tocar el back. Donde el wizard obliga a persistir (sucursal/agenda crean en el
   paso 1 para desbloquear los siguientes), se usan **nombres únicos con timestamp**
   para re-corribilidad. La DB local es descartable, acumular un poco es aceptable.
   No se implementa teardown/borrado en este slice.
3. **Harness:** `@playwright/test` standalone en el repo del front (opción A).

## Arquitectura

### Harness
- `@playwright/test` como devDependency en `FRONTEND-LABORATORIO-procesamiento`.
- `playwright.config.ts`:
  - `baseURL: 'http://localhost:4200'`
  - `webServer`: **no** se levanta automáticamente; se asume back+front corriendo
    (`reuseExistingServer: true` si más adelante se agrega). Para este slice los
    tests fallan con mensaje claro si el server no responde.
  - 1 browser (chromium) en el slice 1.
  - `use.storageState` apuntando al estado de auth generado por el global-setup.
- Script: `"test:e2e": "playwright test"` en `package.json`.

### Auth (una sola vez)
- `e2e/global-setup.ts`: navega al login, ingresa `admin@test.com` / `password`,
  espera el landing autenticado y guarda `storageState` en `e2e/.auth/admin.json`.
- Todos los specs heredan ese estado → arrancan logueados, sin repetir login.
- `e2e/.auth/` va al `.gitignore` (no commitear credenciales/estado).

### Estrategia de selección (sin tocar la app)
- Selectores **accesibles**: texto visible de botones (`getByRole('button', { name: 'Continuar' })`),
  labels de inputs, headings.
- El **`aria-label` del stepper** ya expone el estado de cada paso:
  `"Paso N de M: <título> (actual|completado|bloqueado)"`. Eso permite assertar el
  fix del stepper (completado vs visitado) **sin agregar `data-testid`**.
- Si algún punto resulta inestable con selectores accesibles, se evaluará agregar un
  `data-testid` puntual — pero el default es NO modificar la app.

### Helpers / fixtures
- `e2e/fixtures.ts`:
  - `gotoWizard(page, ruta)` — navega y espera el `ui-wizard-shell` montado.
  - `stepLabel(page, indice)` — devuelve el `aria-label` del paso N (para assertar estado).
  - `expectStepState(page, indice, 'actual'|'completado'|'bloqueado')`.
  - `uniqueName(prefix)` — `${prefix}-${Date.now()}` para registros persistidos.

### Estructura de archivos
```
FRONTEND-LABORATORIO-procesamiento/
  playwright.config.ts
  e2e/
    global-setup.ts
    fixtures.ts
    .auth/                 (gitignored)
    wizards/
      sucursal.spec.ts
      agenda.spec.ts
      paciente.spec.ts
      empleado.spec.ts
      medico.spec.ts
      obra-social.spec.ts
    cross-cutting.spec.ts
```

## Qué valida cada spec

### sucursal.spec.ts (incluye persistencia + fix del stepper)
- Paso "datos": "Nombre" es required; el botón **Continuar arranca deshabilitado**
  y se habilita al completar Nombre válido; al perder foco vacío → borde rojo
  (`.ng-touched.ng-invalid`).
- Al dar Continuar con nombre **único** → el paso "horarios" pasa a `actual`, "datos"
  queda `completado`, y **los pasos 2..5 NO están `completado`** (regresión del bug
  arreglado: antes se tildaban todos).
- Avanzar con Continuar va marcando `completado` de a uno.

### paciente.spec.ts (sin persistir)
- Required del paso general: nombre, apellido, DNI (patrón `^\d{7,}$`), fecha de
  nacimiento (no futura), género, sexo al nacer.
- Continuar deshabilitado hasta que el paso sea válido.
- DNI duplicado: al tipear un DNI existente del seed, se refleja el estado de
  duplicado (Continuar no habilita / hint). _(Si el seed no garantiza un DNI
  conocido, este assert se marca `test.fixme` con nota — ver Riesgos.)_

### empleado.spec.ts (sin persistir)
- Required del paso datos.
- Validación condicional del paso usuario (modo `none`/`existing`/`new`): en modo
  `new`, Continuar/submit requiere los campos del nuevo usuario + branch.

### medico.spec.ts (sin persistir)
- Required del paso datos: nombre, apellido, matrícula, tipo de matrícula.

### obra-social.spec.ts (sin persistir)
- Required de aseguradora: code, name, acrónimo, CUIT (patrón `^\d{2}-?\d{8}-?\d$`).
- "Continuar" del paso planes requiere ≥1 plan.

### agenda.spec.ts
- Required por paso; navegación de pasos. Persiste solo si es necesario llegar al
  último paso, con nombre/branch del seed.

### cross-cutting.spec.ts (extras baratos)
- "Core clínico" **no aparece** en recepción / configuración de agendas / cola de
  extracción (eyebrows removidos).
- Los botones de navegación de wizard son texto sin flechas-glifo (no contienen "→"/"←").

## Manejo de errores / estados

- Si el front/back no están arriba, los tests fallan rápido con un mensaje claro
  (el global-setup verifica el login y aborta si no responde).
- Tests independientes entre sí (cada uno navega desde cero, hereda auth). Sin orden
  implícito.
- Nombres únicos por corrida evitan colisiones de unicidad en re-runs.

## Riesgos / supuestos

- **Dependencia de datos seed:** el assert de DNI duplicado (paciente) depende de que
  exista un DNI conocido en el seed. Si no se puede garantizar, se deja `test.fixme`
  documentado en vez de un test frágil.
- **Servers manuales:** este slice asume back+front corriendo. Automatizar el arranque
  (webServer) queda para un slice posterior.
- **Acumulación en DB:** sucursal/agenda crean registros; aceptable por ser DB local
  descartable. Si molesta, un slice futuro agrega teardown vía API.
- **Selectores accesibles:** si PrimeNG no expone un nombre accesible estable en algún
  control, puede requerir un `data-testid` puntual (cambio mínimo y aislado en la app).

## Fuera de alcance (slices futuros)

- Flujos de negocio end-to-end (login → recepción → atención → extracción).
- Smoke amplio por pantalla.
- Tests de presencia/ausencia de íconos.
- Teardown/cleanup de datos vía API.
- Arranque automático de servers + corrida en CI.
