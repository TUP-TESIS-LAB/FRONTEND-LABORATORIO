# Spec 4 — Tasks: front botón "ver PDF" + fix NG0201

> Spec: [2026-06-27-pdf-front-ver-pdf-design.md](./2026-06-27-pdf-front-ver-pdf-design.md)
> **Jira:** [KAN-147](https://exequielsantoro.atlassian.net/browse/KAN-147). Subagente front (paralelo al back).

Reglas: `ngrx-backend-request` OBLIGATORIO (nada de `this.api.*` directo desde effect sin actions); Regla 4 (español, sin leak, toasts sin emojis → PrimeIcons); toasts desde effect vía `NotificationService` (root), NO `MessageService` per-component. Ante blocker CONSULTAR; verificar consumidores antes de quitar.

## Tasks

- [ ] **T1.** Quitar `providers: [MessageService]` de `validar-protocolo.page.ts:19` (causa NG0201). VERIFICAR si el componente usa `MessageService` para otros toasts; si sí, migrar esos usos a `NotificationService` (o dejar `<p-toast>` global). Reportar qué se migró.
- [ ] **T2.** Nuevas actions `verPdf` / `verPdfSuccess` / `verPdfFailure` (+ listar reports si hace falta). Reducer/selectors: flag loading de descarga.
- [ ] **T3.** Effect `verPdf$` (reemplaza `abrirPdfAlFirmar$`): `getStudyReports` → último → `downloadReport` → success: `URL.createObjectURL` + abrir + `verPdfSuccess`; error: `verPdfFailure` + toast español vía `NotificationService`. Mutations pessimistic. Marble/`provideMockStore` test.
- [ ] **T4.** Quitar el effect temporal `abrirPdfAlFirmar$` (`validacion-detalle.effects.ts:78-95`) y limpiar imports muertos (`window`, `console`, operadores rxjs sin uso). VERIFICAR que ningún test/effect dependa de él.
- [ ] **T5.** Botón "Ver PDF" en `validar-protocolo.page.html:38`, a la IZQUIERDA de "Firmar estudio": visible cuando el estudio está firmado; deshabilitado mientras descarga; al click dispara `verPdf`. VERIFICAR la señal de "firmado" en el detalle.
- [ ] **T6.** Quitar comentarios `// TEMPORAL` de `postanalitica-api.service.ts:40-49` (los métodos pasan a ser estables).
- [ ] **T7.** `npm run build` / lint. Smoke manual: firmar → aparece "Ver PDF" → click abre el PDF; sin NG0201 en consola.
