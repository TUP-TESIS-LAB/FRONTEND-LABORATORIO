---
name: jira-mantenimiento
description: Espacio de trabajo de mantenimiento en Jira, separado del backlog de features. Usar cuando el usuario quiere (a) CARGAR hallazgos - "cargá estos hallazgos", "subí esta lista a mantenimiento", "anotá esto como pendiente", "esto es mantenimiento", pega una lista de relevamiento o apunta a un archivo de relevamiento; o (b) CONSULTAR pendientes - "qué tengo pendiente", "dame los pendientes de mantenimiento", "qué queda del relevamiento", "mostrame los críticos". NO usar después de escribir un plan o spec de implementación - eso es `jira-workflow`. NO usar para tickets de features nuevas planificadas.
---

# Jira — espacio de trabajo de mantenimiento

Backlog aparte para hallazgos de relevamiento: defectos, requerimientos faltantes y deuda
técnica detectados sobre la app ya construida. Vive dentro del proyecto `KAN` pero aislado
del desorden histórico por un Epic contenedor.

**Esta skill NO es `jira-workflow`.** `jira-workflow` convierte un plan escrito en ticket.
Esta captura hallazgos que todavía no tienen plan. Si el hallazgo requiere diseñar una
solución, se carga acá como hallazgo y después se le hace un plan aparte con `jira-workflow`.

## Constantes

| Qué | Valor |
|---|---|
| Sitio (`cloudId`) | `exequielsantoro.atlassian.net` |
| Proyecto | `KAN` |
| **Epic contenedor** | **`KAN-284`** |
| Label fija | `mantenimiento` |
| Issue types válidos | `Historia`, `Tarea`, `Error`, `Epic`, `Subtask` (**en español**) |
| Statuses | `Por hacer`, `En curso`, `En revisión`, `Finalizado` |
| `accountId` del assignee | el del **usuario actual** — resolverlo en la sesión, ver abajo |

El `accountId` **no se hardcodea**: cada quien carga sus hallazgos a su nombre. Resolverlo con
`mcp__atlassian__atlassianUserInfo` (devuelve el `account_id` de la cuenta autenticada) o, si
hay que buscar a otra persona, con `mcp__atlassian__lookupJiraAccountId`. Por CLI el
equivalente es `jira me`.

## Modelo

Cada hallazgo es un issue con:

| Campo | Valor |
|---|---|
| `parent` | `KAN-284` — esto es lo que lo mete en el espacio de mantenimiento |
| `labels` | `mantenimiento` + una de área: `backend`, `frontend`, `analitica`, `turnos`, `financiero`, `portal`, `infra` |
| `priority` | gravedad (ver escala) |
| `issuetype` | `Error` (defecto) · `Historia` (requerimiento faltante) · `Tarea` (deuda técnica / refactor) |
| `status` | `Por hacer` al crear. "Pendiente" es el estado nativo — **no inventar label `pendiente`** |
| `assignee` | el usuario actual |

### Escala de gravedad — fija, no reinterpretar

- **`Highest`** — rompe la demo de tesis o pierde datos. Se resuelve antes que nada.
- **`High`** — funcionalidad rota sin workaround, pero no bloquea la demo.
- **`Medium`** — molesto, hay workaround.
- **`Low`** — cosmético / consistencia.

Ante la duda entre dos niveles, elegir el más bajo y decirlo en el preview. El usuario sube.

### Summary

Prefijo `[Área]` **obligatorio**, ≤ 100 chars, español con términos técnicos en inglés.
Prefijos en uso: `[Backend]`, `[Frontend LAB]`, `[Frontend Portal]`,
`[Backend + Frontend LAB]`, `[Infra]`, `[Docs]`.

### Cuerpo

```markdown
## Síntoma

<qué se ve mal y dónde — pantalla, endpoint, repo>

## Evidencia

* Repo/archivo: `path/al/archivo.ts:42`
* Pasos: 1. … 2. … 3. …
* Detectado en: <relevamiento YYYY-MM-DD | trabajando en KAN-N>

## Impacto

<por qué esa gravedad, a quién afecta>

## Fix propuesto (opt)

<una línea. NO diseñar la solución acá.>
```

Si no tenés dato para una sección, **omitirla** — no escribir "TBD" ni "N/A".
`Fix propuesto` es opcional y de una línea; si el fix necesita diseño, eso es un plan
y le corresponde `jira-workflow`.

## Transporte

**MCP de Atlassian primero.** Si las herramientas no están cargadas:

```
ToolSearch query: "select:mcp__atlassian__searchJiraIssuesUsingJql,mcp__atlassian__createJiraIssue,mcp__atlassian__editJiraIssue,mcp__atlassian__getJiraIssue,mcp__atlassian__transitionJiraIssue,mcp__atlassian__atlassianUserInfo"
```

Forma del create, con los nombres de parámetro **verificados en uso real**:

```json
{
  "cloudId": "exequielsantoro.atlassian.net",
  "projectKey": "KAN",
  "issueTypeName": "Error",
  "summary": "[Backend] ...",
  "description": "## Síntoma\n\n...",
  "contentFormat": "markdown",
  "parent": "KAN-284",
  "assignee_account_id": "<accountId del usuario actual>",
  "additional_fields": {
    "priority": { "name": "High" },
    "labels": ["mantenimiento", "backend"]
  }
}
```

**`priority` y `labels` van sí o sí dentro de `additional_fields`** — no son parámetros de
primer nivel. `description` acepta markdown plano cuando `contentFormat` es `"markdown"`.

`parent` a nivel raíz **funciona con un padre Epic** (verificado creando KAN-285), aunque su
doc diga "Parent for subtasks". No hace falta workaround.

⚠️ La respuesta del `create` **no devuelve** `parent`, `priority` ni `labels` aunque los haya
seteado bien. No concluir que fallaron: verificar siempre con una búsqueda posterior sobre
`parent = KAN-284` pidiendo esos campos explícitamente.

⚠️ Una búsqueda con muchos resultados **excede el límite de tokens** y se vuelca a un archivo:
el parámetro `fields` no alcanza para evitarlo, la respuesta trae la `description` completa
igual. Parsear ese archivo (`ConvertFrom-Json` en PowerShell, `jq` donde exista) en vez de
reintentar la query.

**`jira-cli` como fallback**, solo si el MCP no está disponible. Pre-check obligatorio:

```bash
jira me
```

Si devuelve un email, seguir. Si devuelve `command not found` o `not authenticated`, **parar**
y apuntar al usuario a `<repo>/.claude/skills/jira-workflow/references/setup.md` (existe en
`Backend` y `FRONTEND-LABORATORIO`). Nunca improvisar con `curl`, nunca pedir el API token en el chat.

```bash
jira issue create \
  --project KAN \
  --type Error \
  --summary "[Backend] ..." \
  --body-from-file /tmp/hallazgo.md \
  --parent KAN-284 \
  --priority High \
  --label mantenimiento \
  --label backend \
  --assignee "$(jira me)" \
  --no-input
```

**Una label por flag.** `--label "a,b"` crea una label literal `a,b` — ese bug ya existe en el
backlog de KAN (hay 2 tickets con la label `backend,frontend,analitica,reporteria`). Por MCP el
problema no aplica: `labels` es un array JSON. Si algún flag del CLI es rechazado, verificar
contra `jira issue create --help` antes de reintentar; no inventar variantes.

## Flujo A — Carga desde lista

Disparadores: "cargá estos hallazgos", "subí esta lista a mantenimiento", el usuario pega
un markdown o apunta a un archivo de relevamiento.

1. **Parsear** la lista a items discretos. Un bullet ≠ un item si dos bullets describen el
   mismo problema: fusionarlos. Un bullet con dos problemas distintos: separarlos.
2. **Clasificar** cada item: `issuetype`, `priority`, área, summary con prefijo, cuerpo.
3. **Cruzar duplicados.** Por cada item, buscar por palabras clave:

   ```
   project = KAN AND status != Finalizado AND text ~ "<palabras clave>"
   ```

   `text ~` sobre una frase larga es demasiado estrecho y da falsos negativos. Lo que
   funciona es **encadenar términos sueltos distintivos** con `AND`:

   ```
   project = KAN AND status != Finalizado AND text ~ "turnos" AND text ~ "horas"
   ```

   Marcar como sospecha de duplicado cualquier match plausible, con su key. El cruce también
   detecta **causa raíz compartida**, no solo síntomas idénticos: si dos tickets distintos
   nacen del mismo problema de fondo, decirlo en el preview y dejarlo escrito en el cuerpo
   bajo `## Relacionado`.
4. **Mostrar la tabla de preview y PARAR.** No crear nada todavía.

   | # | Tipo | Grav. | Área | Título propuesto | ¿Dup? |
   |---|---|---|---|---|---|
   | 1 | Error | High | backend | `[Backend] …` | — |
   | 2 | Historia | Low | frontend | `[Frontend LAB] …` | ⚠ KAN-241 |

   Junto a la tabla, explicitar **las decisiones de parseo**: qué bullets se fusionaron, cuáles
   se separaron y por qué. Es lo que el usuario corrige antes de que se cree nada.
5. **Esperar confirmación.** El usuario confirma, edita gravedades/tipos, o descarta filas.
6. **Crear en lote** las filas confirmadas, con `parent`, labels, priority y assignee.
   Con más de ~6 issues, mandarlas **en tandas** de llamadas paralelas; una tanda por mensaje.
7. **Reportar**, una línea por ticket:

   ```
   ✓ KAN-<n> [High] [Backend] … → https://exequielsantoro.atlassian.net/browse/KAN-<n>
   ```

## Flujo B — Detección al vuelo

Disparadores: "anotá esto como pendiente", "esto es mantenimiento", o **detección propia
del agente** mientras trabaja en otra cosa.

- Mismo modelo y mismo cuerpo, un solo ticket.
- Preview de una línea antes de crear: `Error · High · [Backend] <summary>`.
- **Si lo detectás vos sin que te lo pidan: proponer, no crear.** Formato:

  > Esto amerita ticket de mantenimiento (`High`, `Error`): `[Backend] <summary>`. ¿Lo cargo?

  Y seguir con la tarea original. No interrumpir el trabajo en curso para cargar el ticket.

## Flujo C — Consulta

Disparadores: "qué tengo pendiente", "dame los pendientes de mantenimiento", "qué queda del
relevamiento", "mostrame los críticos".

JQL base:

```
project = KAN AND parent = KAN-284 AND status != Finalizado
ORDER BY priority DESC, created ASC
```

Filtros que se suman según lo que pida el usuario:

| Pedido | Cláusula extra |
|---|---|
| "los críticos" / "lo urgente" | `AND priority in (Highest, High)` |
| "de backend" | `AND labels = backend` |
| "los bugs" | `AND issuetype = Error` |
| "lo que falta hacer" (incluye en curso) | (ninguna — el default ya excluye solo `Finalizado`) |
| "todo, incluso lo cerrado" | quitar `AND status != Finalizado` |

Salida: **tabla compacta**, sin descripciones.

| Key | Grav. | Tipo | Área | Título |
|---|---|---|---|---|
| KAN-285 | High | Error | backend | Turnos de 21:00 en adelante se listan al día siguiente |

Si no hay resultados, decirlo en una línea: `Sin pendientes de mantenimiento con ese filtro.`

Para el detalle de un ticket puntual, `getJiraIssue` — no volcar descripciones completas en
la tabla.

## Cerrar un hallazgo

Cuando se resuelve, mover el estado. Por MCP: `transitionJiraIssue`. Por CLI:

```bash
jira issue move KAN-<n> "Finalizado"
```

No borrar tickets. Si era un falso positivo o duplicado, moverlo a `Finalizado` y comentar
por qué.

## Anti-patterns

- ❌ Crear tickets sin `parent = KAN-284` — quedan sueltos en el desorden histórico y la
  consulta no los encuentra nunca.
- ❌ Hardcodear el `accountId` de una persona. Se resuelve por sesión.
- ❌ Inventar una label `pendiente`. El estado `Por hacer` ya lo dice.
- ❌ Usar `Story` / `Task` / `Bug` / `Spike` como issue type. En KAN son `Historia` / `Tarea` /
  `Error`, y los nombres en inglés fallan con `Invalid issue type`.
- ❌ Pasar labels con comas en un solo flag del CLI.
- ❌ Mandar `priority` o `labels` como parámetros de primer nivel del MCP — van en
  `additional_fields` o se ignoran en silencio.
- ❌ Crear en lote sin mostrar la tabla de preview primero.
- ❌ Escribir el diseño de la solución en `Fix propuesto`. Eso es un plan → `jira-workflow`.
- ❌ Volcar descripciones completas en el Flujo C. La tabla es un índice, no un dump.
- ❌ Interrumpir la tarea en curso para cargar un ticket que detectaste vos. Proponelo y seguí.
