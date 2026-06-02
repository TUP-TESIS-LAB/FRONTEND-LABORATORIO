# Diseño — Asignación de rol + secciones en el drawer de usuario

> **Jira:** [KAN-68](https://exequielsantoro.atlassian.net/browse/KAN-68)
> **Fecha:** 2026-06-01
> **Repos afectados:** `FRONTEND-LABORATORIO` (rama `feat/roles-permisos`, PR #20) y `Backend` (rama `feat/permisos-modulares-por-usuario`, PR #29)
> **Relacionado:** KAN-57 (permisos modulares BE), KAN-60 (roles y permisos FE)

## Contexto

La primera iteración dejó **dos conceptos sueltos y desconectados** en el frontend:

1. **Rol** (ADMINISTRADOR, SECRETARIA, …): se asigna al crear el usuario, en el drawer de "Invitar usuario" (empresa → usuarios). Es el puesto/jerarquía y se usa para autorización en el backend.
2. **Secciones de acceso** (`AccessSection`): qué módulos/secciones ve cada usuario. Se gestionaban en una **pantalla dedicada** master-detail (`/roles`, con ítem propio en el sidebar).

El admin no veía la relación entre ambos, y aparecieron dos bugs reales (ver más abajo). La intención original del feature era **enmascarar los roles como conjuntos de secciones**; esta iteración la concreta.

## Objetivo

Unificar la asignación de accesos en **un solo lugar — el drawer de alta/edición de usuario**:

- Elegís un **rol** (uno solo) → pre-marca un **preset de secciones**.
- Ajustás las secciones a mano (extras / quitar).
- Se guarda en una sola operación atómica.
- Se elimina la pantalla dedicada `/roles` y su ítem del sidebar.

El **enforcement** (cómo se *aplican* los permisos al usuario logueado: sidebar y guards manejados por `/me/access-sections`, `AccessRegistry`, `sectionGuard`) **no se toca**. Solo cambia cómo se *asignan*.

## Decisiones tomadas (brainstorming)

| # | Decisión | Elección |
|---|----------|----------|
| Modelo | A: dos conceptos separados · B: rol = preset en el drawer · C: híbrido | **B** |
| Roles por usuario | uno · varios · uno principal + extras | **Uno principal + secciones extra a mano** |
| Fix dropdown roles | BE vs FE | **BE** |
| Alta | two-step (FE) vs atómico (BE) | **Atómico** |
| Pantalla `/roles` | borrar vs redirigir | **Borrar** |

## Diseño

### 1. Drawer de alta/edición (FRONTEND)

Estructura del drawer (empresa → usuarios → Invitar / Editar):

```
┌ Invitar usuario ────────────────┐
│ ◰ Datos del usuario              │  nombre, apellido, email, documento, usuario
│ ◑ Rol                           │  dropdown ÚNICO (single-select)
│   └ "El rol pre-marca las        │
│      secciones. Ajustá las que    │
│      quieras."                    │
│ ☑ Accesos (secciones)           │  checkboxes agrupados por módulo,
│   solo módulos activos del tenant │  pre-tildados por el preset del rol
│ [Cancelar]            [Invitar]  │
└─────────────────────────────────┘
```

- **Rol**: pasa de multiselect a **dropdown único**. Se sigue enviando como `roleIds: [rolElegido]` (el backend acepta lista; mandamos uno).
- **Secciones**: se muestran agrupadas por módulo (reusar `secciones-checklist` de la feature roles-permisos como subcomponente). Solo se listan las secciones **grantable** del tenant (`GET /api/v1/access-sections`).
- **Tooltip** (nicety): cada opción del dropdown de rol puede mostrar en tooltip las secciones que pre-marca.

### 2. Preset rol → secciones (FRONTEND)

Constante en el front `ROLE_SECTION_PRESETS` (mapa `roleCode → AccessSection[]`). Lo que se renderiza es `preset ∩ grantable` (si un módulo no está activo, su sección no aparece).

| Rol | Secciones pre-marcadas |
|-----|------------------------|
| `ADMINISTRADOR` | todas (en el back ya hace bypass de la verificación de secciones) |
| `SECRETARIA` | `ATENCION, PACIENTES, TURNOS, OBRAS_SOCIALES` |
| `RESPONSABLE_SECRETARIA` | `ATENCION, PACIENTES, TURNOS, OBRAS_SOCIALES, FINANCIERO, SUCURSALES` |
| `FACTURISTA` | `FINANCIERO, OBRAS_SOCIALES, PACIENTES` |
| `EXTRACTOR` | `EXTRACCIONES, ATENCION` |
| `TECNICO_LABORATORIO` | `PREANALITICA, ANALITICA, EXTRACCIONES` |
| `BIOQUIMICO` | `PREANALITICA, ANALITICA, POSTANALITICA, PACIENTES` |
| `MANAGER_STOCK` | `STOCK` |
| `EXTERNO` | `PORTAL` |

**Comportamiento al cambiar de rol:** re-aplica el preset, **reemplazando** la selección actual de checkboxes. Los ajustes manuales se mantienen hasta el próximo cambio de rol.

### 3. Guardado atómico (BACKEND + FRONTEND)

Para evitar el estado parcial "usuario creado pero sin accesos", el guardado es **una sola llamada** por operación:

- **Alta:** `POST /api/v1/user/internal` — extender `InternalUserRegisterRequest` y `RegisterInternalUserUseCase.Input` con `sections: List<String>` (códigos de `AccessSection`). El use case crea el usuario y asigna sus secciones **en la misma transacción**.
- **Edición:** `PUT /api/v1/user/{id}` — extender `UpdateUserRequest` y `UpdateUserUseCase.Input` con `sections: List<String>` (reemplazo total). Misma transacción.
- **Validación BE:** los códigos deben ser `AccessSection` válidos **y** grantable para el tenant; si no, error 400 con mensaje en español, user-friendly y sin leak (regla #4 del CLAUDE.md). Defensivamente se intersecta con grantable.
- El endpoint standalone `PUT /api/v1/user/{id}/access-sections` queda **sin uso** en el flujo de admin (se puede conservar por completitud de API). Los `GET` de catálogo (`/access-sections`) y de secciones del usuario (`/user/{id}/access-sections`) **se mantienen** (precarga en edición).

### 4. Bug fix — dropdown de roles vacío (BACKEND)

`RoleController` mapea `@RequestMapping("/api/v1/role")` + `@GetMapping("/")` → ruta real `/api/v1/role/`. El front pega `GET /api/v1/role` (sin barra). En Spring Boot 4 el trailing-slash matching está apagado → **404** → `loadRolesFailure` → dropdown vacío.

**Fix:** `@GetMapping("/")` → `@GetMapping` en `RoleController` (queda `/api/v1/role`, consistente con `EmpresaSmtpController`, `EmpresaWhiteLabelController`, etc.).

### 5. Bug fix — sin confirmación al guardar (FRONTEND)

`NotificationService` (`core/services/notification.service.ts`) empuja a un signal `notifications` que **ningún componente renderiza**. Lo usan 6 features (empresa, pacientes, médicos, obras-sociales, sucursales/empleados, roles-permisos) → todos sus toasts son invisibles.

**Fix:** componente **`<app-notification-host>`** montado una vez en el shell de la app, que lee `notificationService.notifications()` y renderiza los toasts (con severidad, auto-dismiss, y `dismiss()` manual). Cumple regla #4 (español, sin leak). Arregla los 6 features de una.

### 6. Limpieza (FRONTEND)

- **Borrar:** `roles-permisos.page`, su ruta (`roles-permisos.routes.ts`), el ítem "Roles y permisos" del sidebar (`sidebar.nav.ts`), el componente `usuarios-picker`. La ruta `/roles` deja de existir.
- **Reusar:** `secciones-checklist` como subcomponente del drawer; del store/API de secciones se reusan `getGrantable` (catálogo) y `getUserSections` (precarga en edición). El **guardado** ya **no** pasa por `setUserSections` (PUT standalone) sino por el create/update atómico de usuario (ver sección 3) — `setUserSections` queda sin uso en este flujo.

## Testing

- **BE:** use cases de create/update con secciones (asignación atómica, validación de códigos inválidos y no-grantable, mensaje de error sanitizado); `RoleController` responde en `/api/v1/role`.
- **FE:** `ROLE_SECTION_PRESETS` + intersección con grantable; drawer (cambiar rol re-aplica preset, alta y edición mandan secciones, precarga en edición); `<app-notification-host>` (renderiza/oculta del signal); que `/roles` ya no resuelva.

## Fuera de alcance

- Permisos de lectura/escritura (sigue siendo binario por sección).
- Presets configurables por tenant (la constante es fija en el front).
- Pantalla de panorama "quién ve qué" (sería el modelo híbrido C → ticket aparte).
- Cambiar el enforcement (sidebar/guards del usuario logueado).
