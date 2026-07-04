# Liquidaciones — lifecycle→listado, convenios en paso 1, multi-plan (tabs+search)

> **Jira:** [KAN-175](https://exequielsantoro.atlassian.net/browse/KAN-175)
> **BE PR:** #117 · **FE PR:** #125 · Continuación KAN-172/174.

## Decisiones (usuario)
- **A. Lifecycle → listado:** informar/anular navegan al listado + toast de éxito (hecho).
- **B. Facturar (INFORMED→BILLED):** redirigir a "registrar pago" de caja precargando la liquidación.
  **BLOQUEO:** caja "Registrar movimiento" NO produce un `Payment` linkeable; el BE exige `paymentId`.
  `cobro-atencion` crea Payment pero atado a atención de paciente. → requiere decisión/BE follow-up. FUERA por ahora.
- **C. Paso 1 convenios:** multiselect + lista debajo de los planes tildados con su convenio (arancel + IVA).
- **D. Revisar multi-plan:** tabs por plan + apilado, con searchbar (paciente/DNI/nro protocolo/análisis).
- **E. ESPECIAL:** fuera (motor BE ya está; UI aparte).

## Contrato BE (C) — endpoint de planes con convenio
`GET /api/v1/financiero/settlements/plans?insurerId={id}` (roles ADMIN/SECRETARIA/RESP_SECRETARIA) →
```
PlanConvenioResponse[] = {
  planId: number,
  planName: string,
  iva: number | null,            // insurer_plan.iva (null = exento)
  arancel: number,               // ub_value del convenio vigente HOY (0 si no hay)
  nbuVersionId: number | null,
  hasActiveAgreement: boolean     // false si no hay convenio vigente hoy
}[]
```
Reusa `CoverageAgreementPort.findPlanIdsByInsurer` + `findPlanBillingInfo` + `findActiveByPlanId(planId, hoy)`.

## FE
- **C:** al elegir OS, además del multiselect, mostrar debajo la lista de planes tildados con arancel+IVA
  (marcar en rojo `hasActiveAgreement=false`). Consumir el endpoint nuevo (store).
- **D:** en Revisar, cuando hay >1 plan → barra de tabs por plan (además del apilado) + searchbar que filtra
  las prestaciones por paciente/DNI/nro protocolo/nombre de análisis (client-side sobre el preview).

## TDD + edge cases
Ver el detalle en el ticket KAN-175 / la conversación. Edge: plan sin convenio vigente (arancel 0 + flag),
convenio hoy≠fecha-prestación (previewWarning por plan), plan con IVA vs exento en la misma liquidación,
excluir todo un plan, concurrencia lifecycle (409 ya resuelto), redondeo por-plan preview↔export.
