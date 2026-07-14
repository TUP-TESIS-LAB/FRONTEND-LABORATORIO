// Tipo propio de la feature `saas-admin`. NO se importa desde `@features/financiero`
// (que tiene su propio modelo equivalente) porque la convención del proyecto prohíbe
// imports entre features. El DTO se duplica a propósito.

export type FiscalProvider = 'NONE' | 'ARCA' | 'COLPPY';

export type CondicionIva = 'RESPONSABLE_INSCRIPTO' | 'RESPONSABLE_MONOTRIBUTO' | 'EXENTO';

export interface TenantFiscalConfig {
  targetTenantId: number;
  provider: FiscalProvider;
  invoicePointOfSale: string | null;
  razonSocial: string | null;
  cuit: string | null;
  ingresosBrutos: string | null;
  domicilioComercial: string | null;
  condicionIva: CondicionIva | null;
  inicioActividades: string | null;
}

export interface UpsertTenantFiscalConfigRequest {
  targetTenantId: number;
  provider: FiscalProvider;
  invoicePointOfSale: string | null;
  razonSocial: string | null;
  cuit: string | null;
  ingresosBrutos: string | null;
  domicilioComercial: string | null;
  condicionIva: CondicionIva | null;
  inicioActividades: string | null;
}

/** Valores crudos del form de identidad fiscal, antes de serializar al request. */
export interface FiscalIdentityFormValue {
  invoicePointOfSale: string;
  razonSocial: string;
  cuit: string;
  ingresosBrutos: string;
  domicilioComercial: string;
  condicionIva: CondicionIva | null;
  inicioActividades: Date | null;
}

/**
 * Arma el request de identidad fiscal.
 *
 * Los 6 campos de identidad (razonSocial, cuit, ingresosBrutos, domicilioComercial,
 * condicionIva, inicioActividades) son un BLOQUE para el backend: si los 6 llegan null
 * preserva la identidad guardada; si al menos uno tiene valor, reemplaza los 6 y deja en
 * null los que falten. Por eso el request lleva SIEMPRE los 6 campos, nunca un subconjunto
 * parcial — un PATCH parcial borraría en silencio los campos omitidos.
 *
 * Vive acá y no dentro del componente para poder testear el contrato sin TestBed.
 */
export function buildFiscalConfigRequest(
  targetTenantId: number,
  v: FiscalIdentityFormValue,
): UpsertTenantFiscalConfigRequest {
  return {
    targetTenantId,
    provider: 'NONE',
    invoicePointOfSale: v.invoicePointOfSale || null,
    razonSocial: v.razonSocial || null,
    cuit: v.cuit || null,
    ingresosBrutos: v.ingresosBrutos || null,
    domicilioComercial: v.domicilioComercial || null,
    condicionIva: v.condicionIva || null,
    inicioActividades: isoFromDate(v.inicioActividades),
  };
}

/** Serializa a `YYYY-MM-DD` en hora local (no UTC: `toISOString()` correría el día). */
export function isoFromDate(d: Date | null): string | null {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return null;
  }
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Parsea `YYYY-MM-DD` como fecha LOCAL.
 *
 * `new Date('2026-07-10')` la interpreta como medianoche UTC, que en un offset negativo
 * (Argentina, UTC-3) cae el día anterior a las 21:00 — el datepicker mostraría 09/07.
 * Construir la fecha por componentes evita el corrimiento. Es el inverso exacto de
 * `isoFromDate`.
 */
export function dateFromIso(iso: string | null): Date | null {
  if (!iso) {
    return null;
  }
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}
