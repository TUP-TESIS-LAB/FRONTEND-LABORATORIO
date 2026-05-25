# CLAUDE.md — Frontend Laboratorio

Define cómo trabajan los agentes en este repo. Léelo antes de cualquier tarea.

---

## Reglas inviolables

Estas reglas NO admiten excepciones implícitas. Si te tentás a saltearlas porque "el contexto cambia" o "ya está casi terminado", PARÁ y aplicalas igual.

### 1. Plan ↔ Jira ticket es obligatorio

**Después de cualquier invocación de `superpowers:writing-plans`, ANTES de invocar `superpowers:subagent-driven-development`, `superpowers:executing-plans`, o cualquier ejecución de código de implementación, DEBÉS invocar `jira-workflow` y obtener un ticket de Jira creado o confirmado.**

Aplica también cuando:

- Escribís un archivo en `docs/superpowers/plans/**`.
- Escribís un archivo en `docs/superpowers/specs/**` con scope de implementación claro.
- Cerrás la fase `design` o `tasks` de cualquier flujo SDD.
- El usuario dice "creá el ticket", "subí esto a Jira", "/jira-ticket".

**Excepciones explícitas** (y SOLO estas):

- El usuario dice literalmente "no crear ticket" / "es un spike" / "lo hago directo".
- El plan ya tiene un `Jira: KAN-...` en el header (entonces actualizar en vez de duplicar).

**Si la skill `jira-workflow` no está disponible o `jira-cli` no está instalado**, parar el flujo, mostrar al usuario los pasos de setup de `.claude/skills/jira-workflow/references/setup.md`, y esperar confirmación. NO improvisar con `curl`, NO pedir el API token en el chat, NO saltear el ticket "para después".

### 2. No empezar a implementar sin spec + plan + ticket

Cualquier cambio no trivial necesita los tres antes de tocar código: spec o design, plan implementable, y ticket de Jira que linkee al plan. Si tu turno empezó con "implementá X", verificá primero que esos tres existen. Si falta alguno, paralo y avisá.

### 3. Plan ↔ ticket bidireccional

Cuando creás el ticket, agregalo al header del plan como `> **Jira:** [KAN-N](URL)`. Esa línea es el contrato de trazabilidad entre el repo y Jira.

### 4. Mensajes de error al usuario — siempre en español, jamás leak de código

Cualquier mensaje que se muestre en la UI (toast, alert, inline error, modal) debe cumplir:
- **Español.** Nada en inglés en la UI final, ni siquiera los defaults de Angular/PrimeNG/RxJS.
- **User-friendly.** Describe el problema en términos del dominio (paciente, atención, análisis), no en términos técnicos.
- **Sin leak de internals.** Prohibido mostrar al usuario: FQCN (`lab.laboratorio.*`, `org.springframework.*`), nombres de clase Java, stack traces, SQL, nombres de tabla/columna, textos tipo `No enum constant`, `NullPointerException`, `ConstraintViolationException`, `Cannot deserialize`. Si la API devuelve un mensaje raw que contiene cualquiera de esos, NO lo mostremos verbatim — mostrar un mensaje genérico o mapear según el código HTTP / código de error.
- Cualquier handler que reciba un `HttpErrorResponse` debe pasar por un mapeo (toast service o helper) que aplique las 3 reglas.

Aplica también a los emojis: NO usar emojis Unicode (📱 ✉ ☎ etc.) — usar PrimeIcons (`<i class="pi pi-mobile">`, `pi-envelope`, `pi-phone`) que están alineados con el design system y se renderizan consistentes en todos los browsers.

---

## Stack del repo

Angular 21 + standalone components, signals, NgRx clásico, PrimeNG, Tailwind. Tests con Vitest. Build con `ng build` o `npm run build`.

## Skills relevantes

Las skills disponibles para este repo están en `.claude/skills/` y vía system-reminders. Algunas críticas:

- **`jira-workflow`** — ver Regla #1.
- **`superpowers:writing-plans`** — escribe el plan implementable. Al terminar, DISPARA `jira-workflow` (regla #1).
- **`superpowers:subagent-driven-development`** — ejecutor del plan. Solo invocable después de tener ticket.
- **`angular-conventions`** — folder structure (`core/shared/layout/features` con `store + pages + components + services + models`), signals para UI local, `OnPush` por default.
- **`ngrx-backend-request`** — patrón NgRx clásico para todo lo que pegue al back.
- **`laboratory-ui`** — design system white-label para portales de laboratorios clínicos.

## Convenciones rápidas

- Branches: `feat/...`, `fix/...`, `chore/...`, `docs/...`, `refactor/...`.
- Commits: convencionales (`feat(empresa): ...`, `fix(saas-admin): ...`).
- PRs: contra `development`. Cada PR linkea su Jira en el body.
- Tests obligatorios para reducers, effects, selectors, guards. Page-level: smoke tests al menos.

## Cuando algo no encaja

Si una regla acá choca con instrucciones del usuario en el chat actual, **el usuario gana** pero pedile que lo confirme explícito ("ok, saltate el ticket por ahora"). No asumas la excepción por contexto.
