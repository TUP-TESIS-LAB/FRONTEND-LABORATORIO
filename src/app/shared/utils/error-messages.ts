/**
 * Sanitiza un mensaje crudo del backend antes de mostrarlo en la UI.
 *
 * Regla #4 del CLAUDE.md del repo: ningún mensaje de error visible al usuario
 * puede contener FQCN, stack traces, SQL, ni texto técnico en inglés. Cualquier
 * handler que reciba un `HttpErrorResponse` debe pasar por acá.
 *
 * El criterio es "fail safe": si el texto crudo huele a leak técnico, se
 * descarta y se devuelve `fallback`. Sólo se muestra el texto del back si pasa
 * todos los chequeos (parece español, corto, sin patrones de leak).
 */
const LEAK_PATTERNS: RegExp[] = [
  /\b(?:org|com|java|lab|net)\.[a-z0-9_.]+\.[A-Z][A-Za-z0-9_]+/, // FQCN tipo lab.laboratorio.modules.X.Y
  /\b[A-Z][A-Za-z0-9_]*(?:Exception|Error)\b/,                   // NullPointerException, ConstraintViolationException
  /\bNo enum constant\b/i,
  /\bCannot deserialize\b/i,
  /\bat [a-zA-Z_$][\w$.]*\([\w$.]+\.java:\d+\)/,                 // stack frames "at foo.bar(File.java:10)"
  /\bSQL(?:Exception| state| error)\b/i,
  /\bnull\s*pointer\b/i,
  /\bcaused by:/i,
];

const ENGLISH_TELLS: RegExp[] = [
  /\binvalid value\b/i,
  /\bbad request\b/i,
  /\binternal server error\b/i,
  /\bnot found\b/i,
  /\bunauthorized\b/i,
  /\bforbidden\b/i,
];

export interface BackendErrorShape {
  status?: number;
  error?: { message?: string; error?: string } | string;
}

export interface HumanizeOptions {
  /** Mensaje de fallback en español cuando el back no devuelve nada usable. */
  readonly fallback: string;
  /** Mapeo opcional de códigos HTTP a mensajes específicos en español. */
  readonly byStatus?: Readonly<Record<number, string>>;
}

/**
 * Convierte un error del back en un mensaje listo para mostrar al usuario.
 *
 * - Si el status matchea `byStatus`, devuelve ese mensaje (prioridad máxima).
 * - Si el body trae un mensaje "limpio" (corto y sin leak), lo devuelve.
 * - En cualquier otro caso, devuelve `fallback`.
 *
 * NUNCA devuelve `err.error.message` verbatim sin pasarlo por los filtros.
 */
export function humanizeBackendError(err: BackendErrorShape | null | undefined,
                                     opts: HumanizeOptions): string {
  if (!err) return opts.fallback;
  if (err.status != null && opts.byStatus?.[err.status]) {
    return opts.byStatus[err.status];
  }
  const raw = extractRawMessage(err);
  if (!raw) return opts.fallback;
  if (!isSafeToShow(raw)) return opts.fallback;
  return raw;
}

function extractRawMessage(err: BackendErrorShape): string | null {
  const e = err.error;
  if (!e) return null;
  if (typeof e === 'string') return e.trim() || null;
  return (e.message ?? e.error ?? '').trim() || null;
}

function isSafeToShow(text: string): boolean {
  if (text.length > 240) return false;
  if (LEAK_PATTERNS.some((re) => re.test(text))) return false;
  if (ENGLISH_TELLS.some((re) => re.test(text))) return false;
  return true;
}
