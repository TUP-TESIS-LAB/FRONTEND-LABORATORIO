# Spec B (Cola del día) — PAUSADO el 2026-05-19

> Brainstorming pausado para clarificar requisitos antes de cerrar el scope.
> Este doc es la constancia de lo decidido y lo abierto. Retomar desde acá.

## Contexto

Segundo spec de la trilogía TURNOS (después de Spec A: Configuración de Agendas).
Cubre la pantalla `/turnos/colas` del módulo TURNOS en el laboratorio. Consume
el `QueueController` del backend (`POST /queue`, `GET /queue`, `PATCH /queue/{id}`,
`POST /queue/reset`). Detalle completo del backend en
`Backend/docs/turnos-backend-reference.md` §3.4.

## Decidido hasta ahora

1. **Scope:** solo lo que cubre `QueueController`. La operativa de atención
   (llamar próximo, boxes, finalizar) la hace otra persona en módulo `ATENCION`.
2. **`/turnos/colas` es la TV de sala de espera** — display pasivo, read-only
   de cara al paciente. Distinto del `/turnos/totem` (también pendiente).
3. **Datos que pide `POST /queue`:** `nationalId` (DNI, requerido),
   `patientId` (nullable si no figura), `branchId` (requerido), `hasAppointment`
   (boolean). Roles: `ADMINISTRADOR` o `SECRETARIA`.
4. **Generación del código público:** backend devuelve `CT-XXXX` (con turno)
   o `ST-XXXX` (sin turno), con auto-reset diario por sucursal.
5. **Flujo recomendado para registrar llegada** (presentado, pendiente de validación):
   - Secretaria ingresa DNI
   - Frontend hace lookup automático en pacientes
   - Si encontró → prefila `patientId`, busca turnos del día y autoinfiere `hasAppointment`
   - Si no → walk-in nuevo paciente
   - Submit → mostrar `publicCode` destacado, opción imprimir ticket

## Abierto — pendiente de clarificar antes de seguir

### 1. División de responsabilidades entre Cola, Atención y Tótem
Pregunta sin responder: si `/turnos/colas` es solo display, **¿dónde viven las
acciones de registrar llegada y de llamar al próximo paciente?**

Opciones que estaban planteadas:
- (a) Spec B incluye una vista admin aparte (mismo route, query param `?display=true` para modo TV)
- (b) Registrar y llamar son responsabilidad del módulo ATENCION (otra persona)
- (c) Registrar lo hace el tótem (Spec D futura) y llamar lo hace ATENCION
- (d) Otra división

### 2. "Llamar al próximo paciente" — gap backend
`QueueStatus` enum hoy tiene: `PENDING, COMPLETED, CANCELED, EXPIRED`. No
existe un estado tipo `CALLED` o `BEING_CALLED`. `PATCH /queue/{id}` solo
transiciona a COMPLETED/CANCELED/EXPIRED.

Si la UI necesita "llamar paciente" como acción, hace falta backend nuevo:
- ¿Nuevo estado en el enum?
- ¿O un endpoint específico `POST /queue/{id}/call` que actualice un flag
  separado y notifique a la TV?

### 3. Comportamiento de la TV
- Layout full-screen, qué se muestra exactamente (último llamado / próximos N / boxes)
- Frecuencia de auto-refresh (polling vs WebSocket — backend no tiene WS hoy)
- ¿Audio / announcement al llamar?
- Contenido cuando la cola está vacía (logo del tenant, mensaje, hora)
- Modo nocturno / cuando el laboratorio está cerrado

### 4. Multi-sucursal en la TV
- ¿Una TV física por sucursal (filtrada a esa branch)?
- ¿Cómo se selecciona la sucursal en la TV (URL `?branchId=X`, sesión de un usuario "display"?)
- ¿Auth: la TV usa un usuario técnico o un token público de display?

### 5. Lookup de paciente por DNI
- ¿Qué endpoint existe en módulo `pacientes` para buscar por DNI? Verificar.
- ¿Devuelve datos suficientes (id, nombre, apellido) para confirmar visualmente?
- ¿Hay rate limit o consideración de privacidad si la secretaria busca cualquier DNI?

## Cómo retomar

1. Releer este doc + `Backend/docs/turnos-backend-reference.md` §3.4.
2. Releer la decisión clave de Spec A (full-page + stepper) para mantener
   consistencia de patrones.
3. Re-invocar `/superpowers:brainstorming` con tema "Spec B Cola del día".
4. Empezar respondiendo los 5 puntos abiertos. Hasta tenerlos resueltos no
   tiene sentido entrar a diseñar layout/componentes.

## Estado de Spec A (relacionado)

Spec A (Configuración de Agendas) está **escrito, commiteado y esperando
review del usuario**. Doc en
`FRONTEND-LABORATORIO/docs/superpowers/specs/2026-05-19-turnos-config-laboratorio-design.md`,
commit `fd92471`. Próximo paso de Spec A: revisión del user + invocar
`superpowers:writing-plans`.
