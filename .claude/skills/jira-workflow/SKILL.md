---
name: jira-workflow
description: Use IMMEDIATELY after a plan is written or finalized — whether via the superpowers:writing-plans skill, an openspec change in openspec/changes/, a file in docs/plans/, or any document the user calls "plan", "spec", "design", "tasks". Creates a Jira issue from the plan via the `jira` CLI, links it back to the plan file path, and outputs the issue URL. Also trigger explicitly when the user says "crear ticket", "subir a Jira", "ticket en Jira", or runs /jira-ticket. SKIP only if the user explicitly says "no crear ticket" or if the plan is for a throwaway spike. If `jira` CLI is not installed or not authenticated, do NOT silently skip — point the user to references/setup.md and stop.
---

# Jira workflow — crear y mantener tickets desde un plan

Este skill convierte un plan escrito (spec, design, tasks, brainstorm con scope claro) en un ticket de Jira y mantiene la referencia bidireccional plan ↔ ticket.

## Cuándo se activa

Automáticamente al terminar la fase de planning de cualquier flujo:
- Después de `superpowers:writing-plans` (cuando el archivo del plan ya existe en disco).
- Al cerrar la fase `design` o `tasks` del flujo SDD (`openspec/changes/<change-name>/`).
- Cuando el usuario dice explícitamente "creá el ticket", "subí esto a Jira", "/jira-ticket".

**No** activarse si:
- El usuario dijo "es un spike" / "no hace falta ticket" / "lo hago directo".
- El cambio ya tiene un ticket (verificar en el plan si hay `Jira: PROJ-123` en el frontmatter o header).

## Pre-check obligatorio antes de crear el ticket

Correr **siempre** antes de cualquier `jira issue create`:

```bash
jira me 2>&1 | head -5
```

### Si devuelve un email válido
Seguir con el flujo de creación.

### Si devuelve `command not found` / `jira: no se reconoce` / equivalente
El CLI no está instalado. **NO crear el ticket "más tarde", NO improvisar con curl, NO pedir tokens en el chat.** Mostrale al usuario este mensaje completo, adaptado a su SO:

> **Para crear el ticket necesitás instalar `jira-cli` una vez. Te llevo paso a paso:**
>
> **1. Instalar el binario** (elegí según tu SO):
>
> - **Windows con Scoop** (recomendado):
>   ```powershell
>   scoop install jira
>   ```
>   Si no tenés Scoop:
>   ```powershell
>   Invoke-RestMethod get.scoop.sh | Invoke-Expression
>   scoop install jira
>   ```
> - **macOS**:
>   ```bash
>   brew tap ankitpokhrel/jira-cli && brew install jira-cli
>   ```
> - **Linux**: descargar el binario para tu arch desde https://github.com/ankitpokhrel/jira-cli/releases, moverlo a `/usr/local/bin/jira` y `chmod +x`.
>
> Verificá con `jira version`.
>
> **2. Generar tu API token de Atlassian** (no usa SSO):
> - Andá a https://id.atlassian.com/manage-profile/security/api-tokens
> - "Create API token", label `claude-code-{tu-nombre}` o similar
> - **Copiá el token AHORA** — no se vuelve a mostrar. Guardalo en tu password manager.
> - El token es equivalente a tu password: nunca lo pegues en chat, nunca lo commitees.
>
> **3. Configurar el CLI:**
> ```
> jira init
> ```
> Te va a preguntar:
> - **Installation type:** `Cloud`
> - **Link to Jira server:** la URL completa (ej. `https://tup-tesis-lab.atlassian.net`)
> - **Login email:** el email con el que entrás a Jira
> - **API token:** pegá el que copiaste
> - **Default project:** la key del proyecto principal (ej. `LAB`)
>
> **4. Verificá:** corré `jira me` — tiene que devolver tu email. Si dice `not authenticated`, el token está mal, repetí el paso 2.
>
> Cuando termines, decime "listo" y retomo desde donde quedamos: te creo el ticket de este plan automáticamente.

Después de mostrar esto, **parar el flujo**. No seguir hasta que el usuario confirme. Si tenés dudas sobre algún paso específico, hay más detalle en `references/setup.md` (mismo contenido, ampliado con troubleshooting).

### Si devuelve `not authenticated` / `401` / `403`
El CLI está instalado pero la auth está rota (token vencido, mal pegado, o el usuario nunca corrió `jira init`). Mostrale al usuario:

> **El CLI `jira` está instalado pero no autenticado.** Resolvé con uno de estos dos pasos:
>
> - **Si nunca corriste el setup:** corré `jira init` y completá los datos (URL de Jira, email, API token, default project). Si no tenés API token, generá uno en https://id.atlassian.com/manage-profile/security/api-tokens
> - **Si el token venció o lo revocaste:** generá uno nuevo en la misma URL y corré `jira init` de nuevo (o editá `~/.config/.jira/.config.yml` y reemplazá el campo `api_token`).
>
> Verificá con `jira me`. Cuando devuelva tu email, decime "listo" y te creo el ticket.

Parar el flujo hasta que confirme.

### Si devuelve un error de red / DNS / timeout
Probablemente la URL de Jira no es la del tenant del usuario. Pedile que verifique la URL en su browser (la que aparece cuando entra a Jira) y la actualice en `~/.config/.jira/.config.yml` campo `server`.

## Flujo de creación

1. **Resolver el proyecto** (Jira project key, ej. `LAB`, `TUP`). Si la sesión actual no tiene contexto del proyecto, leerlo de:
   - `.jira/.config.yml` (default project del usuario), o
   - El frontmatter del plan (si tiene `project: LAB`), o
   - Preguntar al usuario.

2. **Armar `summary` (≤ 80 chars)** — usar el título del plan, NO el filename. Quitar prefijos tipo `feat:`, `fix(...)`. Mantenerlo accionable: imperativo en español si el equipo trabaja en español, "Add X" si en inglés. Verificar el estilo de los tickets recientes con:
   ```bash
   jira issue list --plain -q "ORDER BY created DESC" --columns key,summary --limit 5
   ```

3. **Armar `description` desde el plan** con esta estructura mínima:
   ```
   ## Contexto
   <una línea o dos del "por qué" — sacalo de la sección Goals/Motivation/Why del plan>

   ## Plan
   <archivo>: ruta relativa al repo
   <link directo al archivo en el remote si es público>

   ## Tasks
   <bullet list de las tasks/steps del plan>

   ## Acceptance criteria
   <criterios verificables del plan>
   ```
   No copiar el plan entero — el ticket es un puntero al plan, no un duplicado. La fuente de verdad sigue siendo el archivo en git.

4. **Tipo de issue:**
   - `Story` si es feature/funcionalidad nueva visible al usuario.
   - `Task` si es refactor, infra, migración, deuda técnica.
   - `Bug` solo si arregla un bug reportado (referenciá el ticket original o el report).
   - `Spike` si es investigación con timebox (raro porque normalmente esos no llegan acá).

5. **Crear el issue** (auto-asignado al usuario actual del CLI):
   ```bash
   ASSIGNEE="$(jira me)"                  # email del autenticado; falla rápido si la auth está rota
   jira issue create \
     --project "<PROJECT_KEY>" \
     --type "<Story|Task|Bug>" \
     --summary "<summary>" \
     --body-from-file /tmp/jira-body.md \
     --assignee "$ASSIGNEE" \
     --no-input
   ```
   `--no-input` falla rápido si falta un campo obligatorio (no abre el editor).

   **El assignee es obligatorio en este flujo: quien sube el plan se hace dueño del ticket.** Si `jira me` no devuelve un email válido, parar y mandar a `references/setup.md` — no crear el ticket sin asignar.

6. **Capturar la clave devuelta** (ej. `LAB-42`) y construir la URL:
   ```
   https://<site>.atlassian.net/browse/LAB-42
   ```
   El `<site>` está en `.jira/.config.yml` como `server`.

7. **Cerrar el loop bidireccional:**
   - En el plan: agregar al frontmatter o en la línea siguiente al título: `Jira: LAB-42 — <URL>`.
   - En el ticket: si el repo es público o el equipo lo tiene clonado, agregar el path del plan en el body. Si no, agregar un link al archivo en el remote (ej. `https://github.com/TUP-TESIS-LAB/Backend/blob/<branch>/openspec/changes/<name>/spec.md`).

8. **Reportar al usuario**, una sola línea:
   ```
   ✓ Ticket creado: LAB-42 → https://<site>.atlassian.net/browse/LAB-42 (linkeado en <plan-path>)
   ```

## Cuando el plan ya tiene ticket

Si encontrás `Jira: LAB-42` en el plan, NO crear uno nuevo. En vez de eso:

1. Verificar estado actual:
   ```bash
   jira issue view LAB-42 --plain
   ```
2. Si el plan cambió desde la última sync (el archivo se editó), actualizar la descripción del ticket:
   ```bash
   jira issue edit LAB-42 --body-from-file /tmp/jira-body.md --no-input
   ```
3. Si se completaron tasks del plan, ofrecé moverlo de estado:
   - `jira issue move LAB-42 "In Progress"` (al empezar implementación)
   - `jira issue move LAB-42 "Done"` (cuando se cierra el PR de implementación)

## Campos opcionales (si el equipo los usa)

Detectar si el equipo usa estos antes de setearlos sin permiso:

- **Epic / Parent**: `--parent LAB-1` si el plan es parte de una iniciativa más grande mencionada en el plan.
- **Labels**: `--label backend,migration` si las labels son consistentes en el equipo (chequear con `jira issue list --plain --columns labels --limit 10`).
- **Assignee**: ya se setea por defecto al usuario que corre la skill (ver paso 5). Solo cambiarlo si el usuario pide explícitamente "asignáselo a X" — entonces resolver el accountId con `jira user search "<nombre o email>"` y pasarlo a `--assignee`.
- **Story points / estimate**: NO setear sin pedirle al usuario.
- **Sprint**: NO setear automáticamente. Los sprints los maneja el equipo en grooming.

## Anti-patterns

- ❌ Crear ticket en `In Progress` directamente. Siempre arranca en `To Do` / `Backlog`.
- ❌ Copiar el plan completo al body del ticket. El ticket es un puntero, no una copia. Si el plan cambia, el ticket queda desactualizado en silencio.
- ❌ Inventar el `<PROJECT_KEY>` si no está claro. Preguntar.
- ❌ Crear el ticket sin actualizar el plan con la referencia inversa. La trazabilidad rompe.
- ❌ Forzar `jira` con `--no-input` si la auth está rota — el comando falla con un mensaje genérico y el usuario no se entera del problema real. Hacer el pre-check (`jira me`) primero.

## Cuando jira-cli no está instalado o sin auth

Ya está cubierto arriba en "Pre-check obligatorio". El principio: **nunca silenciar el problema ni saltearlo**. La skill insiste con el setup paso a paso en el chat, espera la confirmación del usuario ("listo"), y recién entonces retoma la creación del ticket.

NO improvisar con la API REST de Jira a mano (`curl` con basic auth o similar). NO pedirle al usuario que pegue un API token en el chat — el token viaja por logs, transcripts y memoria del agente.

## Referencias

- `references/setup.md` — instalación + auth para un compañero nuevo (sin SSO).
- `references/cheatsheet.md` — comandos `jira` más usados.
