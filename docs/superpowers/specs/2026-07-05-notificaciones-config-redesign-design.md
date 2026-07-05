# Rediseño visual — Config de Notificaciones (tab Empresa) — Design

> Follow-up de KAN-176 ([[2026-07-03-notificaciones-in-app-design]]). Ticket: [KAN-185](https://exequielsantoro.atlassian.net/browse/KAN-185).

## Problema

La tab **Notificaciones** de Empresa (`empresa/pages/notificaciones/notificaciones-config.page.ts`) es hoy una **lista 100% plana**: un `@for` que renderiza una `emp-event-config-row` por cada tipo de evento, cada una una tarjeta alta con toggle + título + **dos multiselect siempre abiertos** (usuarios, roles).

No escala. El sistema crece por **dos ejes**:
- **Tipos de evento** — cada módulo suma los suyos (`NotificationEventType`: hoy 6 eventos en 3 secciones; domicilio/urgencias/atención/stock sumarán más).
- **Usuarios/roles** — más gente elegible por evento.

Con la lista plana, a decenas de eventos la página es un scroll interminable sin jerarquía ni forma de encontrar, filtrar o agrupar.

## Objetivos

- Página que aguante decenas/cientos de tipos de evento sin degradarse: densa, escaneable, buscable, filtrable.
- Reusar el **componente de tabla estándar** del repo (`ui-table`, `shared/ui/components/data-table`) con filas expandibles.
- Rehacer el editor de destinatarios con un flujo **rol-primero, aditivo, con excepciones** que distinga claramente rol vs usuario.
- Consistencia con el design system (laboratory-ui); errores en español (Regla #4); refresco/estado por el store existente.

## No-objetivos

- No se toca la **bandeja del usuario** (campana/popover `features/notifications`) — otra superficie, otro esfuerzo.
- No se cambian los **triggers** de fan-out ni el scheduler SLA del backend (solo el cálculo de destinatarios efectivos).
- No se agrega canal nuevo (email/push): sigue in-app.

## Diseño — Frontend

### Página: tabla estándar + toolbar

Reemplazar el `@for` de filas por `ui-table` (`[expandable]="true"`).

**Toolbar** (arriba de la tabla):
- Buscar por nombre de evento (filtro cliente sobre `title`).
- Filtro **Módulo** (dropdown; opciones = secciones distintas presentes).
- Segmentado **Todos / Solo activos** (`enabled`).
- Contador: **"N eventos · M activos"**.

**Columnas** (`TableColumn[]` + celdas `uiCell`):
| Columna | Contenido |
|---|---|
| Evento | `title`; si `!hasTrigger` → tag "Próximamente" (fila grisada, toggle disabled). |
| Módulo | badge coloreado por sección (`requiredSection`). |
| Estado | `p-toggleswitch` inline (prende/apaga sin expandir; disabled si `!hasTrigger`). |
| Destinatarios | resumen en chips: roles + usuarios + "+N"; o "Sin destinatarios". |

Empty state estándar del `ui-table`. Densidad la del repo. La fila entera es clickeable para expandir (lo provee `ui-table`); el toggle y los chips detienen la propagación.

### Fila expandida: editor de destinatarios (rol-primero, aditivo + excepciones)

Contenido en `*uiRowExpansion`. Al expandir, el output `rowExpand` dispara `loadEligible(eventType)` (hoy se carga al abrir el picker; se migra al expand).

Dos zonas **visualmente distintas** (color/ícono/borde): **Roles** (violeta) y **Usuarios** (azul).

Flujo:
1. **Rol (aditivo/dinámico):** se elige un rol → queda como destinatario `ROLE`. Le llega a **todos los que tengan el rol, incluidos los usuarios nuevos** (aditivo, sin mantenimiento).
2. Al agregar el rol se **precargan sus usuarios tildados** (todos los elegibles con ese rol, marcados como "reciben").
3. **Destildar un usuario = excepción:** esa persona deja de recibir aunque tenga el rol; el rol sigue aditivo para el resto y para los futuros.
4. **Usuarios extra:** se pueden agregar usuarios puntuales por fuera de cualquier rol.
5. Aviso "sin acceso" (ícono + tooltip) en usuarios sin permiso a la pantalla del evento (`tieneAcceso === false`), como hoy.
6. **Auto-save** en cada cambio (patrón actual `updateConfig`).

### Estado / store (FE)

Reusar el store `notificaciones-config` (`empresa/store/notificaciones-config`). Ajustes:
- `EventConfig` suma `section: string` (módulo) para columna/filtro.
- Recipients suma el tipo de **exclusión** (ver modelo de datos abajo).
- Filtros (búsqueda/módulo/solo-activos) son **estado local de UI** (signals en el page), no del store — filtran sobre `configs()`.
- `loadEligible` se dispara desde `rowExpand` en vez de `pickerOpen`.

## Diseño — Backend (cambios necesarios)

### 1. Exponer el módulo/sección en la config

`NotificationConfigResponse` debe incluir `requiredSection` (o un `moduleLabel` derivado) por evento. `NotificationEventType` ya lo tiene (`requiredSection()`). Cambio chico en el mapper/DTO + el modelo FE.

### 2. Modelo de destinatarios con excepciones (rol aditivo + exclusiones)

Hoy los destinatarios son una unión de `{ROLE | USER}`. El fan-out efectivo pasa a ser:

```
destinatarios = ( ⋃ usuarios_de(rol) para cada ROLE  ∪  usuarios USER explícitos )
                − usuarios EXCLUDED
```

Diseño de datos (a confirmar contra la persistencia real de recipients en implementación):
- Sumar un tercer tipo de recipient **`EXCLUDED_USER`** (`ref` = userId) a la lista existente — mínima churn de schema (reusa la tabla/estructura de recipients con un `type` nuevo).
- La lógica de fan-out (donde hoy resuelve ROLE→usuarios y agrega USER) resta los `EXCLUDED_USER` al final.
- Una exclusión sin ningún ROLE que la contenga es inerte (no rompe) — se puede limpiar, pero no es obligatorio.
- `dedupByEntity` y el resto del pipeline no cambian.

**Regla de negocio:** un `EXCLUDED_USER` solo tiene efecto sobre usuarios que entrarían por un ROLE; nunca "excluye" a un USER explícito (si está como USER explícito y como EXCLUDED, gana la exclusión — documentar y testear el caso borde, aunque la UI no debería permitirlo).

## Data flow

1. `GET /notificaciones/configs` → `EventConfig[]` (ahora con `section` + recipients que pueden incluir `EXCLUDED_USER`).
2. Page filtra en cliente (search/módulo/solo-activos) → render en `ui-table`.
3. Expandir fila → `rowExpand` → `loadEligible(eventType)` → `GET /{eventType}/eligible` (usuarios con `tieneAcceso` + roles).
4. Editar (toggle rol/usuario/exclusión) → `updateConfig({eventType, enabled, recipients})` (recipients ahora puede llevar `EXCLUDED_USER`) → `PUT` → auto-save toast.

## Manejo de errores

- Toda falla HTTP → toast español via el patrón actual (Regla #4). Sin leak.
- Backend: si llega un recipient con tipo desconocido → 422 español (no `No enum constant`).

## Testing

- **BE:** unit del fan-out con exclusiones (rol con 3 usuarios − 1 excluido = 2; excluido nuevo que entra al rol sigue excluido; USER explícito + EXCLUDED del mismo id → no recibe); mapper expone `requiredSection`; handler no-leak del tipo inválido.
- **FE:** reducer/effects para `EXCLUDED_USER` y `section`; page specs — filtros (search/módulo/solo-activos), expand dispara `loadEligible`, toggle inline, editor rol-primero (agregar rol precarga tildados, destildar produce exclusión, agregar usuario extra). `ui-table` con `[expandable]`. Build AOT.

## Riesgos / decisiones abiertas (para la fase de plan)

- **Persistencia de exclusiones:** confirmar la estructura real de la tabla de recipients antes de fijar `EXCLUDED_USER` vs una lista separada. Preferencia: reusar la estructura con `type` nuevo.
- **Resumen de destinatarios en la columna colapsada** cuando hay exclusiones: mostrar "Rol Extractores (−1)" o similar — definir en el plan.
- **Migración de data existente:** los configs actuales (solo ROLE/USER) siguen válidos sin cambios; las exclusiones son opt-in.
- Cross-repo: BE (`modules/notificaciones`) + FE (`features/empresa`). Un ticket, dos PRs (uno por repo) contra development.
