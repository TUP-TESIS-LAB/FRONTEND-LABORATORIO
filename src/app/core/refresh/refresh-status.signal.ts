import { Signal, signal } from '@angular/core';

export interface RefreshStatus {
  /** Última vez que el cliente recibió una respuesta exitosa (200 o 304). */
  lastSuccessAt: Date | null;
  /** Si el polling está pausado (por visibility o por el caller). */
  paused: boolean;
  reason?: 'hidden' | 'manual';
}

export interface RefreshStatusController {
  readonly status: Signal<RefreshStatus>;
  markSuccess(): void;
  markPaused(reason: 'hidden' | 'manual'): void;
  markActive(): void;
}

const INITIAL: RefreshStatus = { lastSuccessAt: null, paused: false };

export function createRefreshStatusSignal(): RefreshStatusController {
  const status = signal<RefreshStatus>(INITIAL);
  return {
    status,
    markSuccess: () => status.update((s) => ({ ...s, lastSuccessAt: new Date() })),
    markPaused: (reason) => status.update((s) => ({ ...s, paused: true, reason })),
    markActive: () => status.update((s) => ({ ...s, paused: false, reason: undefined })),
  };
}
