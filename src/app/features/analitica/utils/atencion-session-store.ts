export type AtencionUiStep = 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';

export interface AtencionSession {
  atencionId: number;
  uiStep: AtencionUiStep;
}

const SESSION_KEY = 'atencion:current';

export function writeAtencionSession(value: AtencionSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

export function readAtencionSession(): AtencionSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AtencionSession;
  } catch {
    return null;
  }
}

export function clearAtencionSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
