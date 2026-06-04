# TV de extracción — diseño UX/UI (mockup, sin backend)

> **Fecha:** 2026-06-04
> **Estado:** spec aprobado, pendiente plan de implementación
> **Scope:** UI/UX únicamente. Sin endpoint real. Datos mockeados en frontend.
> **Jira:** _pendiente (se crea al cerrar plan)_

---

## 1. Propósito

Crear una segunda pantalla pública estilo "TV de sala de espera" pero dedicada a la cola de **extracción**, análoga a la TV de atención existente (`/display/:tenantSlug/:branchId`).

El laboratorio quiere mostrar en distintos monitores:

- **TV de atención** — llama pacientes a su consultorio (ya existe, se modifica mínimamente).
- **TV de extracción** — llama pacientes al box de extracción correspondiente (`publicCode → Box N`).

La pantalla queda lista para ser conectada al backend más adelante. Por ahora usa datos mockeados.

## 2. Contexto del proyecto

- La TV actual (`sala-espera.page.ts`) hace polling cada 3s al endpoint público `/public/display/:tenantSlug/:branchId/queue`, mantiene `DisplaySnapshot`, dispara beep al detectar un nuevo paciente llamado y renderiza un layout 70/30 (cola + carrusel de avisos).
- El modelo de **boxes por sucursal todavía no existe** en el backend; se agregará en una tarea separada a `branch_totem_config` o entidad análoga. Mientras tanto, la TV de extracción muestra un `boxNumber` mockeado.
- Eventualmente, la lógica de llamado de extracción será similar a la del llamado de recepción (acción del operador en el módulo de extracción dispara el evento). Esto queda fuera de scope acá.

## 3. Requerimientos

1. Ruta dedicada: `/display/extraccion/:tenantSlug/:branchId`.
2. Mismo layout estructural que `sala-espera` (cola 70% + ads 30%, paginación de 5 entries, beep, estados loading/queue/empty/closed/error).
3. Diferenciación visual:
   - Badge `● EXTRACCIÓN` en verde `#059669` arriba-izquierda de la cola.
   - `code` (publicCode grande) en verde.
   - Background tinte verde claro `#ecfdf5`.
   - Page indicator activo en verde.
   - Audio: `/assets/audio/beep-extraccion.mp3` (placeholder; si falta, `catch` solo loguea warn).
4. Cada entry muestra `publicCode → Box N` (donde N es el `boxNumber` mockeado).
5. Botón **"Simular llamada"** en esquina inferior derecha (debug/mockup only). Click agrega entry random al tope, dispara beep automáticamente.
6. Modificación mínima a `sala-espera.page` (TV atención existente): badge `● ATENCIÓN` arriba-izquierda en color primary del tenant. Cero cambio de lógica.

## 4. Arquitectura

### Archivos nuevos

```
src/app/features/turnos/pages/tv-extraccion/
  ├─ tv-extraccion.page.ts            # copia de sala-espera.page.ts con ajustes
  ├─ tv-extraccion.page.html          # copia con badge EXTRACCIÓN + → Box N
  ├─ tv-extraccion.page.scss          # paleta verde
  ├─ tv-extraccion.page.spec.ts       # vitest smoke
  └─ tv-extraccion-mock.service.ts    # devuelve DisplaySnapshot mockeado

public/assets/audio/beep-extraccion.mp3   # placeholder (puede faltar)
```

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/app.routes.ts` | Agregar ruta `display/extraccion/:tenantSlug/:branchId` |
| `src/app/features/turnos/pages/sala-espera/sala-espera.page.html` | Agregar `<div class="tv-badge tv-badge--atencion">` |
| `src/app/features/turnos/pages/sala-espera/sala-espera.page.scss` | Estilos `.tv-badge` (compartidos por ambas TVs vía clase) |
| `src/app/features/turnos/models/public-display.model.ts` | Agregar `boxNumber?: number` opcional a `PublicQueueEntry` |
| `src/app/layout/sidebar/sidebar.nav.ts` | Agregar entry de navegación al `/display/extraccion/lab-demo/1001` al lado del link existente a `/display/lab-demo/1001` |

### Decisión: componente duplicado, no compartido

Aprobado por el operador. Razones:

1. Las TVs son estructuralmente idénticas hoy, pero se proyecta que diverjan cuando aparezca el modelo de boxes (extracción gana data shape distinta).
2. La fricción de duplicar ~250 líneas es chica.
3. Cero riesgo a la sala-espera actual.
4. Alineado con la preferencia YAGNI (no abstraer hasta tener un segundo caso real con divergencia).

## 5. Mock data + flujo

### `TvExtraccionMockService`

```ts
@Injectable({ providedIn: 'root' })
export class TvExtraccionMockService {
  private mockSnapshot = signal<DisplaySnapshot>(this.buildInitialSnapshot());

  fetchSnapshot(tenantSlug: string, branchId: number): Observable<DisplaySnapshot> {
    return of(this.mockSnapshot()).pipe(delay(50));
  }

  /** Disparado por el botón "Simular llamada" del componente. */
  simulateNewCall(): void {
    const next = this.buildNewEntry();
    this.mockSnapshot.update(snap => ({
      ...snap,
      entries: [next, ...snap.entries].slice(0, 12),
    }));
  }

  listPublicBranches(tenantSlug: string): Observable<PublicBranch[]> {
    return of([{ id: 1001, code: 'LAB-CENTRO', description: 'Sucursal Centro' }]);
  }

  private buildInitialSnapshot(): DisplaySnapshot { /* 6-8 entries con boxes 1-3 */ }
  private buildNewEntry(): PublicQueueEntry { /* random publicCode + boxNumber + lastCalledAt=now */ }
}
```

### Datos iniciales del mock

| Campo | Valor |
|---|---|
| `tenantName` | "Laboratorio Demo" |
| `branchName` | "Sucursal Centro" |
| `serverTime` | hora actual del cliente |
| `openWindow` | `{ startTime: "08:00", endTime: "18:00" }` |
| `entries` | 6 entries: `EX-001 → Box 1`, `EX-002 → Box 2`, ... `EX-006 → Box 3` con `lastCalledAt` a horas plausibles |

### Comportamiento del componente

Idéntico a `sala-espera.page.ts` salvo:

- Inyecta `TvExtraccionMockService` en lugar de `PublicDisplayService`.
- Polling cada 3s mantiene la sincronización con `mockSnapshot()` (que sólo cambia cuando el operador clickea el botón).
- `playBeep` usa `/assets/audio/beep-extraccion.mp3`. Si el archivo no existe, el `catch` ya presente loguea warn — no rompe el flujo.
- Botón "Simular llamada" llama a `mockService.simulateNewCall()`.

## 6. Botón "Simular llamada" (debug)

```html
<button class="tv-simulate-btn" (click)="onSimulate()">
  <i class="pi pi-bell"></i>
  Simular llamada
</button>
```

- Posición: `position: absolute; bottom: 1.5rem; right: 1.5rem;` dentro de `.cola-section`.
- Estilo: opacidad 0.6, fondo blanco/borde gris, no llama la atención de un visitante.
- Comentario inline `// TODO: remover cuando el endpoint real esté integrado`.

## 7. Diferenciación visual — resumen

| Elemento | TV Atención | TV Extracción |
|---|---|---|
| Badge | `● ATENCIÓN` en var `--brand-primary` (azul por default) | `● EXTRACCIÓN` en verde `#059669` |
| `code` color | sin cambio (`var(--brand-primary)`) | hardcoded verde `#059669` |
| `page-indicator .dot.active` | sin cambio | verde `#059669` |
| `.cola-section` background | sin cambio (`#f5f7fa`) | tinte verde claro `#ecfdf5` |
| Audio | `beep.mp3` (sin cambio) | `beep-extraccion.mp3` (nuevo asset) |
| Botón simulador | _no aplica_ | esquina inferior derecha |

## 8. Estados visibles (smoke)

| Estado | Cuándo se ve | Diseño |
|---|---|---|
| `loading` | Primer tick (~30ms) antes de la primera respuesta del mock | Texto "Cargando..." centrado |
| `queue` | Estado principal — siempre activo después del primer fetch | Layout 70/30 con cola + carrusel |
| `empty` | No alcanzable en el mockup (la lista nunca queda vacía) | (heredado de sala-espera) |
| `closed` | No alcanzable (openWindow cubre día completo) | (heredado) |
| `error` | No alcanzable (mock no falla) | (heredado) |

## 9. Testing

### Unit (vitest)

`tv-extraccion.page.spec.ts` — un único spec smoke:

- Render OK con `TvExtraccionMockService` provisto.
- Badge `EXTRACCIÓN` presente en el DOM.
- Primer entry muestra texto `→ Box N`.
- Click en botón "Simular llamada" → llama `mockService.simulateNewCall()`.

**Sin tests** para `sala-espera` modificada (cambio es markup-only y el spec existente sigue pasando).
**Sin tests** para `TvExtraccionMockService` (mock descartable).

### Smoke manual

Test plan que va en el body de la PR:

1. `npm start` → abrir `http://localhost:4200/display/extraccion/lab-demo/1001`.
2. Verificar badge verde `● EXTRACCIÓN` arriba-izquierda.
3. Verificar 6 entries con formato `EX-00N → Box N` en verde.
4. Click en "Simular llamada" → ver nueva entry en el tope; oír beep (o ver warn si falta el .mp3).
5. Simular 6+ llamadas → verificar paginación rotando cada 15s.
6. Abrir en otra tab `http://localhost:4200/display/lab-demo/1001` → verificar badge azul `● ATENCIÓN`, resto idéntico.

## 10. Entrega

- **Rama**: rama integradora del cierre del viernes 2026-06-06 (TBD nombre exacto al ejecutar el plan). El bundle único decidido por el operador absorbe este trabajo.
- **PR**: una sola, contra `development`, con todo el cierre. Body incluye el test plan de la sección 9 + los smokes pendientes del backlog 2026-06-02.
- **Jira**: se crea ticket dedicado tipo "TV de extracción (mockup UI)" al cerrar el plan via `jira-workflow`. Link bidireccional plan ↔ ticket en el header.

## 11. Out of scope (no entra acá)

- Endpoint backend real `/public/display/extraccion/:tenantSlug/:branchId/queue`.
- Modelo `Branch.boxes` en backend (pendiente — referenciado en memoria del proyecto).
- Lógica de "llamar a extracción" desde el módulo de atención/extracción (eventualmente análoga al llamado de recepción).
- Override de paleta por tenant (el verde de extracción queda hardcoded; si un tenant quiere otro, se discute aparte).
- Audio asset real (queda como placeholder `.mp3` o ausente; el componente tolera la ausencia).
- Migración del modelo del flujo nuevo a `recepcion-sin-totem` (gap conceptual identificado previamente, fuera de scope).
