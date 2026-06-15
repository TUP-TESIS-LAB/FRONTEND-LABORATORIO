# Extracción — Scroll interno en tablas + color del tenant en los llamados

> **Estado:** Diseño (2026-06-15).
> **Rama:** `feat/extraccion-scroll-color` (worktree `.worktrees/extraccion-pulido`, off `development`).
> **Alcance:** Frontend puro (CSS + atributos de PrimeNG). Sin backend.
> **PRs (regla del usuario): 1 solo PR de FE** (este tópico no toca backend).
> **Jira:** [KAN-112](https://exequielsantoro.atlassian.net/browse/KAN-112)

## Item 1 — Scroll interno en las tablas de extracción

### Estado actual
La página de cola de extracción ([`extraction-queue.page.ts`](FRONTEND-LABORATORIO/.worktrees/extraccion-pulido/src/app/features/analitica/pages/extraction-queue/extraction-queue.page.ts)) tiene 2 columnas (`.columns` grid 1fr 1fr), cada una en un `.block` (flex column, `height:100%; min-height:360px`, sin tope máximo):
- **Cola** (izquierda): `<p-table [value]="awaiting()" styleClass="p-datatable-sm">` (línea 116) — **sin** `scrollable`/`scrollHeight`.
- **En curso** (derecha): componente [`in-progress-list.component.ts`](FRONTEND-LABORATORIO/.worktrees/extraccion-pulido/src/app/features/analitica/components/in-progress-list/in-progress-list.component.ts) con otra `<p-table>` cruda (línea 36) — también sin scroll.

Con muchas filas, las tablas crecen sin límite y scrollea **toda la página** (el shell), no la tabla. La idea es que cada tabla tenga su scroll interno y el layout de 2 columnas quede fijo.

### Target
Dar scroll interno a ambas tablas usando el scroll nativo de PrimeNG, encajado en el flex del `.block`:
- Agregar `scrollable scrollHeight="flex"` a las dos `<p-table>` (cola + en curso). `scrollHeight="flex"` hace que la tabla ocupe el alto disponible del contenedor flex y scrollee su body internamente.
- Asegurar que cada `.block` da un alto acotado: el `.block` ya es `display:flex; flex-direction:column`. La `p-table` (o el `app-in-progress-list`) debe ser `flex:1; min-height:0` para que `scrollHeight="flex"` tenga contra qué medir. Ajustar CSS:
  - En `extraction-queue`: el wrapper de la p-table de la cola → `flex:1; min-height:0`.
  - En `in-progress-list`: su `:host` ya es `flex; flex-direction:column; height:100%; min-height:0`; la `p-table` interna → `flex:1; min-height:0` (y `:host ::ng-deep .p-datatable-table-container { overflow:auto }` si hace falta).
- El header sticky de la tabla (PrimeNG lo da con `scrollable`) mantiene los títulos visibles al scrollear.
- Verificar que con pocas filas no quede un hueco raro (el `min-height:360px` del `.block` se mantiene; la tabla flex llena).

## Item 2 — Llamados de la TV de extracción con el color del tenant

### Estado actual
[`tv-extraccion.page.scss`](FRONTEND-LABORATORIO/.worktrees/extraccion-pulido/src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss) define `$extraccion-green: #059669` (línea 2) y lo usa **hardcodeado** en los llamados (la card con el código + box):
- `.code` (código del paciente llamado) → `color: $extraccion-green` (línea 239).
- `.box` (número de box) → `color: $extraccion-green` (línea 247).
- Acentos del card del llamado → `$extraccion-green` (líneas 60, 115, 121: background/border/color).

La TV de **sala de espera** (turnos) ya lo hace bien y es el patrón a copiar ([`sala-espera.page.scss`](FRONTEND-LABORATORIO/.worktrees/extraccion-pulido/src/app/features/turnos/pages/sala-espera/sala-espera.page.scss)): `.code`/`.box` usan `var(--brand-primary, #1a1a1a)` y los acentos `var(--p-primary-color, #2563eb)`.

### Target
Los llamados deben usar el **color primary del tenant** (el mismo que el sidebar), con fallback al verde actual:
- Reemplazar los usos de `$extraccion-green` que estilan **el llamado** (`.code`, `.box`, y el acento/borde del card del llamado en líneas 60/115/121) por `var(--brand-primary, #059669)` (mismo patrón que `sala-espera`).
- El `--brand-primary` lo setea `TenantThemeService.applyTheme()` al iniciar; `#059669` queda de fallback si el tema no cargó.
- No cambiar el fondo blanco general (`$extraccion-bg`) ni otros estilos no relacionados al llamado.

## Testing

- `ng test` — smoke de `extraction-queue.page` y `tv-extraccion.page` siguen verdes (cambios CSS/atributos).
- Smoke visual: 
  - Cola de extracción con muchas filas → cada tabla scrollea internamente, el layout de 2 columnas no se estira, el header queda sticky.
  - TV de extracción con un tenant de color custom (no verde) → el código/box del llamado salen en el color del tenant; sin tema, fallback verde.

## Fuera de scope
Cambios de datos/polling de extracción, layout de la página más allá del scroll, otros colores de la TV que no sean el llamado.
