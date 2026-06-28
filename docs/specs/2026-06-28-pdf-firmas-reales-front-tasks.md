# Tasks (front): selector de firmante autorizante en informe-pdf

> Spec: [back] laboratorio/docs/superpowers/specs/2026-06-28-pdf-firmas-reales-design.md
> **Jira:** [KAN-151](https://exequielsantoro.atlassian.net/browse/KAN-151). Va DESPUÉS del back (consume sus endpoints).

Reglas del repo (OBLIGATORIO): `ngrx-backend-request` (toda llamada al back por store/effects, nada de `this.api.*` suelto), Regla 4 (español, sin leak, toasts/avisos sin emojis → PrimeIcons), reuso del patrón existente. Ante blocker CONSULTAR; verificar consumidores antes de modificar.

Contexto: la pantalla es `informe-pdf.page.ts` (módulo empresa) que ya edita footer/leyenda/logos vía `ReportTemplateApiService` y muestra `informe-pdf-preview` con las columnas "Controló"/"Autorizado por" (hoy mock).

## Tasks

- [ ] **T1.** `ReportTemplateApiService` + store (actions/effects/selectors) + tipos: agregar `authorizedSignerEmployeeId` al modelo/DTO de report-template; nuevo método/efecto para `GET authorizer-candidates` → `[{employeeId, fullName, registration, hasSignature}]`.
- [ ] **T2.** En `informe-pdf.page.ts`: `<select>` "Firmante autorizante" (junto a footer/leyenda) poblado con TODOS los candidatos. Al elegir, guardar `authorizedSignerEmployeeId` en el PUT de report-template (ngrx). Si el elegido tiene `hasSignature=false`, aviso suave ("Este firmante no tiene firma cargada; el informe mostrará '-'").
- [ ] **T3.** `informe-pdf-preview.component.ts`: la columna "Autorizado por" muestra la firma real del autorizante elegido (no el mock "DRA. LEILA CASTILLO"); sin elegir o sin firma → "-". VERIFICAR cómo obtener la imagen del firmante para el preview (¿viene en candidates? ¿endpoint de firma?); si no hay forma directa, CONSULTAR.
- [ ] **T4.** Sincronizar con el patrón existente de la página (señales, clobber-race ya resuelto para footer/legend — no reintroducirlo). El select se hidrata del server una vez, como footer/legend.
- [ ] **T5.** `npm run build` + lint si existe. Smoke manual: elegir firmante → preview lo muestra → (con back) generar informe → "Autorizado por" con la firma real; elegir admin sin firma → "-".
