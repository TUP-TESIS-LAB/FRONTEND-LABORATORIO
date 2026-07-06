# Spec — Firma del empleado: paso "Firma" con 3 modos (front) — Design

> **Jira:** [KAN-149](https://exequielsantoro.atlassian.net/browse/KAN-149)
> **Estado:** ✅ Implementado y verificado (smoke OK) — KAN-149, commit 46f0a1c.
> **Repo:** front `FRONTEND-LABORATORIO`.
> **Origen:** trabajo de firmas del informe PDF — el bioquímico que firma necesita cargar su firma.

## Reglas del repo a respetar (OBLIGATORIO)

- **`ngrx-backend-request`** para las llamadas al back (el alta/edición de empleado ya usa su store; no romper ese patrón).
- **Regla 4:** mensajes en español, user-friendly, sin leak. Toasts sin emojis → PrimeIcons.
- **Reuso:** el componente de firma va en `shared/ui` (decisión del usuario), reutilizable por empleado y a futuro médico.

## Reglas de ejecución para el implementador (OBLIGATORIO)

- **Ante un blocker, CONSULTAR — no decidir solo.** Ej: si el `SignaturePadComponent` no se deja componer dentro del nuevo wrapper, PARAR y reportar.
- **Antes de modificar un componente compartido, verificar consumidores.** El `SignaturePadComponent` lo usa hoy el form de MÉDICO (`med-firma-step`). Si el nuevo componente de 3 modos lo envuelve o lo cambia, NO debe romper el form de médico. Si rompe, evaluar wrapper que reuse sin tocar el pad, y reportar.
- Priorizar lo ya hecho en este repo en cualquier merge.

## Problema

El empleado/bioquímico que FIRMA los informes no tiene forma de cargar su firma: el form de empleado (`empleado-form.page.ts`, pasos Datos → Usuario → Resumen) NO tiene paso de firma, y el `employee.service.ts` no manda `signature`. El back ya tiene el campo (lo expone el spec back), pero el front no lo carga. Hoy el pad de firma solo existe para MÉDICO (`med-firma-step` con `SignaturePadComponent`), que únicamente soporta el modo "dibujar".

## Objetivo

El alta/edición de empleado tiene un paso **"Firma"** (visible solo si es bioquímico) con un componente de **3 modos** — **dibujar (canvas)**, **subir imagen**, **texto** — que SIEMPRE produce un `signature` = **base64 PNG dataURL**. El back recibe siempre un PNG, sin saber el modo. Editar un empleado precarga su firma actual y permite cambiarla o limpiarla.

## Hallazgos verificados (base del diseño)

- `SignaturePadComponent` (`shared/ui/components/signature-pad`) es un `ControlValueAccessor`, emite `canvas.toDataURL('image/png')` (dataURL PNG), inputs `width()/height()`, métodos `clear()/empty()/writeValue()`. **Reutilizable tal cual para el modo "dibujar".**
- El form de empleado arma grupos `datos / direccion / usuario` (`empleado-form.page.ts` L104-133); NO hay grupo `firma`. El toggle `isBiochemist` está en `datos-step` con `formControlName="isBiochemist"` (L37).
- `employee.service.ts` create/update NO mandan signature hoy.
- Util existente para canvas→dataURL: `rotulo-pdf.service.ts` L37 (`toDataURL('image/png')`) — referencia para el modo "texto".
- NO existe helper genérico file→base64 (`FileReader.readAsDataURL`) en `shared/ui` — hay que crearlo para el modo "imagen".

## Diseño

### A. Componente compartido `shared/ui` — selector de 3 modos
- Nuevo componente (ej. `SignatureInputComponent` en `shared/ui/components/signature-input`), `ControlValueAccessor`, `formControlName="signature"`. Valor = **base64 PNG dataURL** (mismo contrato que el pad actual).
- Selector de modo (tabs o radio): **Dibujar / Subir imagen / Texto**.
  - **Dibujar:** compone el `SignaturePadComponent` existente (NO duplicar; reusar). Su dataURL es el valor.
  - **Subir imagen:** `<input type="file" accept="image/png,image/jpeg">` → `FileReader.readAsDataURL()` → dataURL. **Validación (criterio report-template):** solo PNG/JPG, máx ~2MB; si no cumple → mensaje español (sin emoji) y no setea el valor. (Decisión usuario: PNG/JPG ≤2MB.)
  - **Texto:** input de texto → se **rasteriza** en un canvas con una fuente tipo firma (cursiva/script) → `toDataURL('image/png')`. (Decisión usuario: el modo texto se convierte a PNG, NO se guarda como texto — el back/PDF reciben siempre PNG.)
- `writeValue(dataURL)`: en edición, precarga la firma existente (mostrarla como preview; el modo por defecto puede ser "imagen"/preview).
- Botón limpiar → valor null.
- **VERIFICAR:** que envolver/compón­er el `SignaturePadComponent` no rompa el `med-firma-step`. Si el pad necesita cambios para componerse, preferir un wrapper que lo use sin modificarlo. CONSULTAR si no se puede.

### B. Integración en el form de empleado
- Agregar paso **"Firma"** a `EMPLOYEE_FORM_STEPS` entre `usuario` y `resumen` (`{ key: 'firma', title: 'Firma', subtitle: 'Firma del bioquímico' }`).
- Nuevo `FormGroup` `firma: { signature: [null] }` en `empleado-form.page.ts`.
- **Visibilidad condicionada:** el paso "Firma" se muestra/habilita SOLO si `datos.isBiochemist` está activo (decisión usuario). Si se desactiva isBiochemist, el paso se oculta y el signature se limpia (evitar firma huérfana en un no-bioquímico). VERIFICAR cómo el `WizardShell`/stepper maneja pasos condicionales; si no soporta pasos dinámicos, CONSULTAR el approach (ej. mostrar el paso siempre pero deshabilitar el contenido con aviso).
- `resumen-step`: mostrar preview de la firma si hay.

### C. Service / payload
- `employee.service.ts`: incluir `signature` en el payload de create y update (el back lo acepta — spec back). Tipos `CreateEmployeeRequest`/`UpdateEmployeeRequest` del front: agregar `signature?: string | null`.
- En edición: el GET de empleado ahora trae `signature` (spec back) → precargar en el grupo `firma`.

## Análisis de impacto (a verificar por el implementador)

- **`SignaturePadComponent`:** consumido por `med-firma-step`. NO romperlo. El nuevo componente lo REUSA. Si hace falta refactor del pad, hacerlo compatible con ambos y verificar el form de médico.
- **Stepper condicional:** agregar un paso que aparece/desaparece según isBiochemist puede afectar la navegación (índices de paso, validación del wizard). Es el punto más delicado del front — VERIFICAR el `WizardShellComponent` y, si los pasos son estáticos por índice, CONSULTAR.
- **Edición:** confirmar que el form de edición precargue signature sin romper si viene null (empleado viejo sin firma).
- **Tamaño del payload:** una imagen ≤2MB en base64 viaja en el JSON del empleado. Aceptable; el back tiene @Size de respaldo.

## Testing

- Componente `SignatureInputComponent`: los 3 modos producen un dataURL PNG; imagen inválida (tipo/tamaño) → no setea + mensaje; texto → rasteriza; clear → null. CVA: writeValue precarga.
- Form empleado: el paso Firma aparece solo con isBiochemist; create/update mandan signature; edición precarga.
- Smoke manual: alta de bioquímico con cada modo → se guarda → reabrir en edición muestra la firma.

## Fuera de alcance

- Que el PDF dibuje la imagen de firma (back/PDF, otro spec).
- Cambiar el form de médico para usar el nuevo componente de 3 modos (a futuro; por ahora solo se reusa el pad sin romperlo).
- Firma para roles que no firman (solo bioquímico cumple).
