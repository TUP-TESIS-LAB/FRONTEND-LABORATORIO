/**
 * Persistencia local (red de seguridad) de los análisis cargados en el Paso 2
 * del wizard de atención, por `attentionId`.
 *
 * Es un FALLBACK: la fuente de verdad es el backend (analysisAuthorizations
 * activas de la atención). Pero entre el momento en que la secretaria carga
 * análisis en la tabla y el momento en que confirma (Continuar), nada está
 * persistido en el back. Si se va de la atención, recarga (F5) o vuelve de
 * fase ANTES de confirmar, ese borrador se perdía.
 *
 * Guardamos un snapshot mínimo (id de análisis + datos de catálogo necesarios
 * para re-renderizar la fila + isAuthorized) en `localStorage`. Al volver/F5/
 * retomar, el Paso 2 rehidrata desde el backend si hay autorizaciones
 * persistidas; si no, cae a este borrador local.
 */
export interface AnalisisDraftRow {
  id: number;
  shortCode: string;
  name: string;
  familyName: string | null;
  ubCount: number | null;
  isAuthorized: boolean;
}

export interface AnalisisDraft {
  rows: AnalisisDraftRow[];
  isUrgent: boolean;
}

const KEY_PREFIX = 'atencion:analisis-draft:';

function keyFor(attentionId: number): string {
  return `${KEY_PREFIX}${attentionId}`;
}

export function writeAnalisisDraft(attentionId: number, draft: AnalisisDraft): void {
  if (attentionId == null || attentionId <= 0) return;
  try {
    localStorage.setItem(keyFor(attentionId), JSON.stringify(draft));
  } catch {
    // localStorage lleno o deshabilitado: el borrador es opcional, no rompemos el flujo.
  }
}

export function readAnalisisDraft(attentionId: number): AnalisisDraft | null {
  if (attentionId == null || attentionId <= 0) return null;
  const raw = localStorage.getItem(keyFor(attentionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AnalisisDraft;
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAnalisisDraft(attentionId: number): void {
  if (attentionId == null || attentionId <= 0) return;
  localStorage.removeItem(keyFor(attentionId));
}
