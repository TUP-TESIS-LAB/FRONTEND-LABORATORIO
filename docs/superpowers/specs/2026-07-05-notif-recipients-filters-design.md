# Editor de destinatarios — filtros por rol/sucursal + búsqueda + asignados/resumen — Design

> Follow-up de [[2026-07-05-notificaciones-config-redesign-design]] (KAN-185, mergeado). Ticket: _pendiente (jira-workflow)_.

## Problema

El editor de destinatarios (fila expandida de la config de notificaciones, `recipients-editor`) muestra **todos los usuarios del tenant** en una sola lista. Con ~20 usuarios por sucursal × ~5 sucursales son 100+ usuarios: no hay forma de encontrar a alguien, ni de acotar. Además, al agregar un rol NO se filtra a los usuarios de ese rol (limitación diferida de KAN-185: el endpoint `eligible` no discrimina usuarios por rol).

## Objetivos

- Al elegir un rol, **filtrar la lista de usuarios a los que tienen ese rol** (con data real, no el hack "todos cuando hay ≥1 rol").
- **Buscador** + **scroll interno** en la lista de usuarios (y en la de asignados).
- **Filtro por sucursal** (opcional) al lado del rol.
- Reorganizar la fila expandida en: **2 cards arriba** (A: rol+sucursal · B: usuarios) + **1 bloque abajo** que une **usuarios asignados + resumen**.
- Mantener el modelo **aditivo con excepciones** de KAN-185 (rol dinámico; los usuarios nuevos con ese rol reciben solos; destildar = `EXCLUDED_USER`; usuarios puntuales extra).

## No-objetivos

- No cambiar el modelo de recipients del backend (sigue ROLE aditivo + USER + EXCLUDED_USER de KAN-185).
- La **sucursal es filtro visual** de la lista, NO acota el alcance del rol (el rol sigue tenant-wide aditivo).
- No tocar la campana/bandeja del usuario.

## Diseño — Backend (enable del filtro)

El único bloqueante es que `eligible` no expone roles ni sucursal por usuario. `User` (dominio) ya tiene `List<Role> roles` y `Long branch` — está disponible.

1. **`EligibleUserDto`** += `roleCodes: List<String>` + `branchId: Long`.
   - En `ListEligibleRecipientsUseCase`: mapear `u.roles().stream().map(Role::code)` y `u.branch()`.
2. **`EligibleRecipientsResponse`** += `branches: List<EligibleBranchDto>` (`{id, name}`) para poblar el filtro de sucursal del FE.
   - Resolver los nombres de sucursal: inyectar el port de sucursales del módulo empresa/sucursales (`BranchRepositoryPort` o equivalente — confirmar en implementación) y traer las sucursales del tenant (o solo las presentes en los usuarios). Preferencia: todas las del tenant activas, ordenadas por nombre.
3. Sin migración. Backward-compatible (agrega campos; el FE viejo los ignora).

## Diseño — Frontend (rediseño del `recipients-editor`)

Layout de la fila expandida (reemplaza la disposición actual de 2 zonas):

**Card A — Rol y sucursal** (columna izquierda, ~340px):
- **Rol**: multiselect (agrega ROLE aditivo, igual que hoy) — al agregar/quitar roles cambia el filtro de la card B.
- **Sucursal**: dropdown opcional (`branches` del response). Solo filtra la card B; no cambia recipients.

**Card B — Usuarios** (columna derecha, flex):
- **Buscador** (filtra por nombre).
- Chip "filtrado por rol X · Sucursal Y" cuando hay filtros activos.
- Lista de usuarios con checkbox, **`max-height` + scroll interno**. Filtro efectivo = `(sin rol seleccionado ? todos : usuarios cuyo roleCodes ∩ rolesAgregados ≠ ∅) ∧ (sin sucursal ? todos : branchId == sucursal) ∧ matchea búsqueda`.
- Checkbox tildado = recibe. Destildar un usuario que entra por rol → `EXCLUDED_USER`; re-tildar lo saca; tildar uno sin rol → `USER`. Usuario `tieneAcceso=false` → deshabilitado + aviso.

**Bloque inferior (full width) — Asignados + Resumen** (unificados en una card, sin el header "✓ Usuarios asignados" que se veía mal):
- **Resumen** (header del bloque, franja): contador grande ("N reciben") + desglose "rol X (M) − K excepciones + P puntuales" + hint "los nuevos con el rol reciben solos".
- **Usuarios asignados** (abajo): el set **resuelto** de quiénes reciben efectivamente ahora = `(⋃ usuarios de los roles agregados) − exclusiones + usuarios puntuales`, computado en cliente con los `roleCodes` reales. Se muestran como **chips** (nombre + etiqueta "· puntual" cuando aplica + **× para quitar**).
- **Colapso con "Otros":** por defecto se ve **una fila** de chips; si hay más, un chip **"+N otros ▾"** que al tocarlo **despliega el resto en los renglones que hagan falta** (mismo estilo de chips, sin scroll — se expande). "menos ▲" vuelve a colapsar. Estado de colapso = signal local de UI.
- **Reactivo:** la lista es un **computed** de `recipients` + `eligible` — si agregás un usuario desde la card B (o sumás/quitás un rol), el chip aparece/desaparece al instante; no es un snapshot.
- **Quitar desde asignados** (× del chip) saca la notif a ese usuario: si entra por rol → agrega `EXCLUDED_USER` (excepción); si es puntual (`USER`) → lo elimina. Mismo efecto que destildarlo en la card B (reusa `applyUserToggle(id, false)`) → destildarlo ahí también actualiza este bloque. La card de asignados es el segundo lugar para gestionar exclusiones, pensado para "sacarle la notif a alguien" sin buscarlo/filtrarlo primero.

### Lógica (actualiza `recipients-editor.logic.ts` de KAN-185)

- `deriveUserRows` deja de asumir "entra por rol = hay ≥1 rol". Ahora: `enteredByRole(user) = user.roleCodes ∩ addedRoleCodes ≠ ∅`. Esto arregla el filtrado real por rol.
- Nueva `resolveAssigned(recipients, eligibleUsers): AssignedUser[]` = usuarios con `receives==true` (por rol o puntual, menos exclusiones) + su origen (rol/puntual), para la card de asignados y el resumen.
- Nuevas funciones puras de filtrado de la card B: `filterUsers(users, {roleCodes, branchId, search})`.
- El toggle de usuario (`applyUserToggle`) se mantiene, pero `enteredByRole` ahora es por-usuario (no global) — al destildar, si el user entra por alguno de los roles agregados → `EXCLUDED_USER`; si no → quita el `USER`.

### Estado / componentes

- `recipients-editor.component`: signals locales de UI para `search`, `branchFilter` (los filtros no van al store — son navegación). Inputs `config`/`eligible` (ahora con roleCodes/branchId/branches), output `recipientsChange`.
- Separar la card de usuarios y la de asignados en subcomponentes si el template crece (`user-picker-list`, `assigned-summary`), cada uno con su lista scrolleable. Mantener OnPush + signals.

## Data flow

1. Expandir fila → `loadEligible(eventType)` → `eligible` ahora trae `users[{id,nombre,tieneAcceso,roleCodes,branchId}]` + `roles` + `branches`.
2. El editor filtra la card B en cliente (rol ∩ + sucursal + búsqueda). Computa asignados + resumen con los roleCodes reales.
3. Editar (rol/usuario/exclusión) → `recipientsChange` → el page dispatchea `updateConfig` (auto-save, sin cambios de contrato).

## Manejo de errores

- Igual que KAN-185: HTTP → toast español (Regla #4). Sin leak.

## Testing

- **BE:** unit de `ListEligibleRecipientsUseCase` (roleCodes/branchId mapeados; branches list poblada); ajustar el test existente por los campos nuevos del DTO.
- **FE (lógica pura, sin render — límite vitest de KAN-185):** `filterUsers` (por rol real, por sucursal, por búsqueda, combinados); `deriveUserRows` con roleCodes reales (usuario que NO tiene el rol no aparece como "recibe"); `resolveAssigned` (rol − exclusiones + puntuales, con origen); scroll = CSS (no testeable, verificar en build). Specs de las funciones nuevas. Build AOT.

## Riesgos / decisiones abiertas (para el plan)

- **Nombres de sucursal:** confirmar el port real para traer sucursales del tenant (empresa/sucursales). Si es caro, alternativa: derivar `branches` de los `branchId` distintos de los usuarios + un lookup de nombre.
- **Multi-rol de un usuario:** un usuario con 2 roles agregados aparece una vez (dedupe por id) en la card B y en asignados.
- **Sucursal del usuario nula:** usuarios sin sucursal quedan fuera del filtro por sucursal (se muestran solo con "todas").
- Cross-repo: BE (`modules/notificaciones` eligible) + FE (`features/empresa` editor). Un ticket, dos PRs contra development.
