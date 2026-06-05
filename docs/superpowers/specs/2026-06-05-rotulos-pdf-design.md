# Rótulos a PDF (interino, antes de Zebra) — Diseño

> **Fecha:** 2026-06-05
> **Contexto:** Polish de la feature de Atención. Solo **frontend** — sin cambios de backend.
> **Jira:** [KAN-83](https://exequielsantoro.atlassian.net/browse/KAN-83)
> **Rama:** `feat/atencion-recepcion` (un trigger vive en el `resumen-step`/wizard de KAN-77/82). FE-only.

## 1. Problema

Hoy "imprimir los rótulos" = encolar un `PrintJob` para el **agente Zebra** (lo dispara el backend al cerrar la secretaría). Si no hay impresora Zebra registrada + agente corriendo, **no sale nada tangible**, y **no existe ningún PDF de rótulos** (el backend solo genera PDF de worksheets). Necesitamos, **como interino hasta migrar a la Zebra**, poder bajar un **PDF de los rótulos** para imprimirlos en cualquier impresora — sin tocar la funcionalidad de impresión Zebra del backend.

## 2. Objetivos

- Bajar un **PDF descargable** con los rótulos de un protocolo: cada rótulo = **código de barras (Code128 del `label.id`)** + el **nº de protocolo** en texto.
- Disparable desde la **lista de atención** (reimpresión si el paciente los pierde) y desde el **wizard, recién terminada la atención** (cuando ya existe el protocolo).
- **Sin cambios de backend** (se consumen endpoints que ya existen).

## 3. No-objetivos (YAGNI)

- No reemplaza ni toca el flujo Zebra (`PrintJob`, agente, `reprint` del BE). Es un PDF aparte.
- Sin contenido extra en el rótulo (paciente / análisis / fecha). Solo barcode + nº de protocolo.
- Sin generación de PDF server-side, sin selección de impresora.
- Es **interino**: cuando entre la Zebra real, este PDF se descarta o convive como fallback.

## 4. Arquitectura

Todo en el frontend. Dos unidades + dos disparadores.

- **`LabelsService`** (HTTP): `getByProtocol(protocolId: number): Observable<LabelResponse[]>` → `GET /api/v1/analitica/preanalitica/labels/protocol/{protocolId}`. De cada label se usa el `id` (es lo escaneable: el BE resuelve el barcode → label por id).
- **NgRx** (convención `ngrx-backend-request`): acción `loadProtocolLabels({ protocolId })` → effect → `LabelsService.getByProtocol` → `protocolLabelsLoaded({ labels })` / `protocolLabelsFailure({ error })`. Slice de labels en el store (campo `protocolLabels` + selector). `switchMap` (read).
- **`RotuloPdfService`** (puro, sin HTTP): `generate(protocolNumber: string, labels: { id: number }[]): void` → arma el PDF con **jsPDF**; por cada label dibuja un rótulo chico = **barcode Code128 del `label.id`** (vía **jsbarcode** → canvas → `addImage`) + el **nº de protocolo** en texto; dispara la descarga `rotulos-{protocolNumber}.pdf`. Layout: etiquetas chicas en grilla sobre A4.
- **Deps nuevas**: `jspdf` + `jsbarcode` en `package.json`.

**Orquestación (load → generar):** el componente despacha `loadProtocolLabels({protocolId})` y espera el resultado (race sobre `protocolLabelsLoaded`/`protocolLabelsFailure`, como el `waitForMutation` del `resumen-step`); al recibir las labels llama `RotuloPdfService.generate(protocolNumber, labels)`. Si `labels` viene vacío → toast "Este protocolo todavía no tiene rótulos generados" y **no** se baja PDF.

## 5. Disparadores (UI)

1. **Lista de atención** (`atencion-dashboard.component.ts`): acción por fila **"Rótulos PDF"**, visible solo si `row.protocolId != null` (atenciones post-secretaría: AWAITING_EXTRACTION / IN_EXTRACTION / FINISHED). Cubre el caso "el paciente los perdió".
2. **Wizard — vista "Fase de secretaría completada"** (`atencion-wizard.component.ts`, bloque `isPostSecretary()`): botón **"Descargar rótulos"**. NOTA importante: el `protocolId` se crea **al terminar** (`end-secretary-phase`); en la pantalla de Resumen (paso 3, pre-terminar) la atención **todavía no tiene protocolo**. Por eso el botón del wizard va en la **vista post-terminar** (`isPostSecretary`, AWAITING_EXTRACTION), donde `detail().protocolId` ya existe — que es además el momento natural ("recién terminé, bajo los rótulos para el paciente"). **No** va en el `resumen-step`.

## 6. Rótulo — contenido y layout

Minimal: **código de barras (Code128 del `label.id`)** arriba + **nº de protocolo** (texto, monoespaciado) debajo. Tamaño chico configurable (constante, ~40×15 mm), varias etiquetas por hoja A4. Una etiqueta **por label** del protocolo. El "nº de protocolo" se muestra como `P-{protocolId}` (a confirmar en implementación si el protocolo expone un número propio distinto del id).

## 7. Manejo de errores (regla #4: español, sin leak)

- Protocolo sin rótulos (p. ej. `label_configurations` vacío en el tenant → el BE no creó labels) → toast "Este protocolo todavía no tiene rótulos generados." y no se baja PDF.
- Error HTTP al traer las labels → toast genérico en español.
- La acción/botón no aparece si la atención no tiene `protocolId`.

## 8. Testing

- **`RotuloPdfService`** (vitest, mockeando jsPDF/jsbarcode): con N labels genera N rótulos (N `addImage` / N entradas), el texto es el nº de protocolo, el barcode usa `label.id`; con `[]` no genera (o el caller no lo invoca).
- **Effect** `loadProtocolLabels$` (success → `protocolLabelsLoaded`; failure → `protocolLabelsFailure`).
- **Triggers**: la acción de la lista aparece solo con `protocolId`; el botón del wizard aparece en `isPostSecretary`; el click despacha `loadProtocolLabels`.

## 9. Endpoints involucrados (ya existentes)

- `GET /api/v1/analitica/preanalitica/labels/protocol/{protocolId}` → `LabelResponse[]` (de ahí el `id` de cada label).
- (El `protocolId` y la lista de atenciones salen de `GET /api/v1/attentions` / el detalle, que el front ya consume.)

## 10. Archivos afectados (orientativo)

- `features/analitica/services/labels.service.ts` (**nuevo**) — `getByProtocol`.
- `features/analitica/store/atencion/atencion.{state,actions,reducer,effects,selectors}.ts` — `loadProtocolLabels` + `protocolLabels`.
- `features/analitica/services/rotulo-pdf.service.ts` (**nuevo**) — `generate(protocolNumber, labels)`.
- `features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.ts` — acción por fila.
- `features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` — botón en la vista post-secretaría.
- `package.json` — `jspdf` + `jsbarcode`.
- Specs de los anteriores.

## 11. Migración a Zebra (futuro)

Cuando la impresora Zebra real esté operativa (impresora registrada por sucursal + agente polleando), este PDF se vuelve opcional/fallback. El barcode del PDF codifica el `label.id`, igual que el scanner del BE (`findByBarcode`), así que es consistente con esa migración.
