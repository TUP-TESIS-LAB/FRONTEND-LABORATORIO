// Tipo propio de la feature `saas-admin`. NO se importa desde `@features/financiero`
// (que tiene su propio modelo equivalente) porque la convención del proyecto prohíbe
// imports entre features. El DTO se duplica a propósito.

export type FiscalProvider = 'NONE' | 'ARCA' | 'COLPPY';

export type CondicionIva = 'RESPONSABLE_INSCRIPTO' | 'RESPONSABLE_MONOTRIBUTO' | 'EXENTO';

export type ArcaEnvironment = 'HOMO' | 'PROD';

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
  arcaEnvironment: ArcaEnvironment | null;
  arcaIvaPercentage: number | null;
  /** El backend nunca devuelve el certificado ni la clave privada (S09) — solo este flag. */
  arcaCredentialsConfigured: boolean;
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
  arcaCertificatePem: string | null;
  arcaPrivateKeyPem: string | null;
  arcaEnvironment: ArcaEnvironment | null;
  arcaIvaPercentage: number | null;
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
 * Valores crudos del bloque ARCA, antes de serializar al request.
 *
 * `arcaCertificatePem`/`arcaPrivateKeyPem` vienen SIEMPRE vacíos al hidratar el form (el GET
 * nunca los expone, S09): solo se llenan si el usuario tipea credenciales nuevas en esta sesión.
 */
export interface ArcaFormValue {
  provider: FiscalProvider;
  arcaEnvironment: ArcaEnvironment | null;
  arcaIvaPercentage: number | null;
  arcaCertificatePem: string;
  arcaPrivateKeyPem: string;
}

const NULL_ARCA_BLOCK: Pick<
  UpsertTenantFiscalConfigRequest,
  'arcaCertificatePem' | 'arcaPrivateKeyPem' | 'arcaEnvironment' | 'arcaIvaPercentage'
> = {
  arcaCertificatePem: null,
  arcaPrivateKeyPem: null,
  arcaEnvironment: null,
  arcaIvaPercentage: null,
};

/**
 * Arma el bloque ARCA del request.
 *
 * Mismo contrato de merge atómico que la identidad, pero con una trampa extra: el certificado
 * y la clave privada son WRITE-ONLY (S09), el GET nunca los devuelve. Si el form solo trae el
 * `arcaEnvironment`/`arcaIvaPercentage` ya hidratados (porque el usuario tocó otra cosa, ej. la
 * razón social) pero NO tipeó credenciales nuevas, un bloque parcial ("al menos un campo
 * presente") haría que el backend reemplace el bloque completo escribiendo null en los PEM que
 * nunca llegaron — BORRANDO el certificado ya configurado. Por eso el único gatillo para mandar
 * el bloque completo es que el usuario haya tipeado AMBOS PEM en esta sesión; cualquier otro
 * caso manda los 4 campos en null para que el backend preserve lo ya guardado.
 */
function buildArcaBlock(
  arca: ArcaFormValue | undefined,
): Pick<UpsertTenantFiscalConfigRequest, 'arcaCertificatePem' | 'arcaPrivateKeyPem' | 'arcaEnvironment' | 'arcaIvaPercentage'> {
  if (!arca || arca.provider !== 'ARCA') {
    return NULL_ARCA_BLOCK;
  }

  const hasNewCredentials = !!arca.arcaCertificatePem && !!arca.arcaPrivateKeyPem;
  if (!hasNewCredentials) {
    return NULL_ARCA_BLOCK;
  }

  return {
    arcaCertificatePem: arca.arcaCertificatePem,
    arcaPrivateKeyPem: arca.arcaPrivateKeyPem,
    arcaEnvironment: arca.arcaEnvironment,
    arcaIvaPercentage: arca.arcaIvaPercentage,
  };
}

/**
 * Arma el request de configuración fiscal.
 *
 * Los 6 campos de identidad (razonSocial, cuit, ingresosBrutos, domicilioComercial,
 * condicionIva, inicioActividades) son un BLOQUE para el backend: si los 6 llegan null
 * preserva la identidad guardada; si al menos uno tiene valor, reemplaza los 6 y deja en
 * null los que falten. Por eso el request lleva SIEMPRE los 6 campos, nunca un subconjunto
 * parcial — un PATCH parcial borraría en silencio los campos omitidos.
 *
 * El bloque ARCA (ver `buildArcaBlock`) es un segundo bloque atómico independiente. `arca` es
 * opcional para no romper a los callers que solo manejan identidad (provider queda en `NONE`).
 *
 * Vive acá y no dentro del componente para poder testear el contrato sin TestBed.
 */
export function buildFiscalConfigRequest(
  targetTenantId: number,
  v: FiscalIdentityFormValue,
  arca?: ArcaFormValue,
): UpsertTenantFiscalConfigRequest {
  return {
    targetTenantId,
    provider: arca?.provider ?? 'NONE',
    invoicePointOfSale: v.invoicePointOfSale || null,
    razonSocial: v.razonSocial || null,
    cuit: v.cuit || null,
    ingresosBrutos: v.ingresosBrutos || null,
    domicilioComercial: v.domicilioComercial || null,
    condicionIva: v.condicionIva || null,
    inicioActividades: isoFromDate(v.inicioActividades),
    ...buildArcaBlock(arca),
  };
}

function hasAnyIdentityField(
  cfg: Pick<
    TenantFiscalConfig,
    'razonSocial' | 'cuit' | 'ingresosBrutos' | 'domicilioComercial' | 'condicionIva' | 'inicioActividades'
  >,
): boolean {
  return !!(
    cfg.razonSocial ||
    cfg.cuit ||
    cfg.ingresosBrutos ||
    cfg.domicilioComercial ||
    cfg.condicionIva ||
    cfg.inicioActividades
  );
}

/**
 * Detecta el hallazgo #2 de la review (Pertusati): blanquear los 6 campos de identidad es
 * indistinguible, para `buildFiscalConfigRequest`, de "no toqué nada" — el backend interpreta
 * los 6 en null como PRESERVAR la identidad ya guardada. Si eso pasa con una identidad previa
 * configurada, el submit es un no-op silencioso: el backend devuelve la identidad vieja sin
 * tocar, el toast dice éxito, y el form (una vez que se marca pristine) se re-hidrata con los
 * valores viejos — pisando lo que el usuario acababa de borrar.
 *
 * El caller solo debe invocar esto con un form DIRTY (alguien tocó algo): si el form está
 * pristine no hay nada que bloquear, eso ya lo cubre el guard de `save()`.
 */
export function identityWouldBeSilentlyDiscarded(
  currentCfg: Pick<
    TenantFiscalConfig,
    'razonSocial' | 'cuit' | 'ingresosBrutos' | 'domicilioComercial' | 'condicionIva' | 'inicioActividades'
  > | null,
  v: FiscalIdentityFormValue,
): boolean {
  if (!currentCfg || !hasAnyIdentityField(currentCfg)) {
    return false;
  }
  return !v.razonSocial && !v.cuit && !v.ingresosBrutos && !v.domicilioComercial && !v.condicionIva && !v.inicioActividades;
}

/**
 * Detecta el hallazgo #1 de la review (Pertusati, 🔴): con ARCA ya configurado (hay cert
 * guardado), cambiar SOLO `arcaEnvironment` o `arcaIvaPercentage` sin volver a tipear ambos
 * PEM hace que `buildArcaBlock` mande el bloque entero en null (para no borrar el certificado
 * — ver ese comentario). El backend preserva el bloque viejo completo, incluido el ambiente:
 * el cambio de HOMO a PROD nunca aterriza, el toast dice éxito, y el dropdown vuelve a HOMO
 * en la próxima hidratación. Con el contrato atómico actual del backend, re-subir el par de
 * PEM es la única forma de tocar el bloque — así que hay que bloquear el submit en el front
 * en vez de dejarlo pasar en silencio.
 */
export function arcaEnvOrIvaChangeRequiresNewCredentials(
  currentCfg: Pick<TenantFiscalConfig, 'arcaCredentialsConfigured' | 'arcaEnvironment' | 'arcaIvaPercentage'> | null,
  formArca: ArcaFormValue,
): boolean {
  if (!currentCfg || formArca.provider !== 'ARCA' || !currentCfg.arcaCredentialsConfigured) {
    return false;
  }
  const hasNewCredentials = !!formArca.arcaCertificatePem && !!formArca.arcaPrivateKeyPem;
  if (hasNewCredentials) {
    return false;
  }
  const envChanged = formArca.arcaEnvironment !== currentCfg.arcaEnvironment;
  const ivaChanged = formArca.arcaIvaPercentage !== currentCfg.arcaIvaPercentage;
  return envChanged || ivaChanged;
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
