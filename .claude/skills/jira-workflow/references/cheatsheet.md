# `jira-cli` cheatsheet

Comandos que la skill usa con frecuencia. Todos asumen que `jira init` ya corrió y el default project está seteado.

## Verificación de auth

```bash
jira me                                  # email del user autenticado
jira version                             # versión instalada
```

## Crear

```bash
# Issue básico (Story, Task, Bug)
jira issue create -p LAB -t Task -s "Resumen corto" -b "Body del ticket"

# Body desde archivo (recomendado para descripciones largas)
jira issue create -p LAB -t Task -s "X" --body-from-file /tmp/body.md --no-input

# Con parent epic
jira issue create -p LAB -t Story -s "X" -P LAB-100 --no-input

# Con labels y assignee
jira issue create -p LAB -t Task -s "X" -l backend,migration -a $(jira me) --no-input
```

`--no-input` = fail-fast en vez de abrir editor. Usar siempre en automation.

## Leer

```bash
jira issue view LAB-42                   # vista completa
jira issue view LAB-42 --plain           # sin colores, parseable
jira issue list --plain --limit 10       # últimos 10 del default project
jira issue list -a $(jira me) --plain    # asignados a mí
jira issue list -s "To Do" --plain       # filtrar por estado
jira issue list -q 'project = LAB AND status != Done ORDER BY updated DESC' --plain
```

## Editar

```bash
jira issue edit LAB-42 -s "Nuevo título"
jira issue edit LAB-42 --body-from-file /tmp/body.md --no-input
jira issue edit LAB-42 -l +urgent        # agregar label
jira issue edit LAB-42 -l -urgent        # remover label
```

## Transiciones de estado

```bash
jira issue move LAB-42 "In Progress"
jira issue move LAB-42 "In Review"
jira issue move LAB-42 "Done"
# Listar transiciones válidas desde el estado actual:
jira issue view LAB-42 --plain | grep -i status
```

Los nombres de transición dependen del workflow del proyecto. Si "In Progress" no funciona, probá "Start Progress" o similar. Una vez que sabés cómo se llaman en tu proyecto, podés hardcodearlos en automation.

## Comentar

```bash
jira issue comment add LAB-42 "Mensaje del comentario"
jira issue comment add LAB-42 --body-from-file /tmp/comment.md
```

## Buscar (JQL)

```bash
jira issue list -q 'assignee = currentUser() AND status = "In Progress"' --plain
jira issue list -q 'labels = backend AND created > -7d' --plain
```

## Sprint / Board (opcional, si el equipo usa Agile)

```bash
jira sprint list --plain                 # sprints del board default
jira issue list --sprint "Sprint 12"     # issues en un sprint
```

## Tips útiles

- **Output parseable:** siempre agregar `--plain` cuando vayas a parsear con `grep` / `awk` / `jq`.
- **JSON output:** algunos comandos aceptan `--columns` para elegir campos específicos. Ej: `jira issue list --plain --columns key,summary,status --limit 50`.
- **Default flags:** podés setear flags por proyecto editando `.config.yml`. Ej. para que el default issue type sea Task, agregá `issue.type: Task`.
- **Editor:** si querés que `jira issue create` abra `code` (VSCode) en vez de `vi`, exportá `EDITOR="code -w"`.
