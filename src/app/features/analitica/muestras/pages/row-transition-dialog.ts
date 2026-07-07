import { computed, signal } from '@angular/core';
import type { Store } from '@ngrx/store';
import type { Sample } from '../models/sample.model';
import type { Tube } from '../models/tube.model';
import type { RowActionKey, ScreenKey, Transition, TransitionDest } from '../models/transition.model';
import { SCREENS } from '../data/state-machine.config';
import { transitionLabels } from '../store/muestras.actions';

/**
 * Andamiaje del diálogo de transición disparado por el menú kebab por-fila.
 *
 * Encapsula el estado (`activeTransition` + `rowMenuSamples`) y el flujo
 * open → confirm/cancel → `dispatch(transitionLabels)` que las pantallas de
 * Procesamiento y Traslado compartían byte-a-byte. Cada page crea su propia
 * instancia (estado aislado) vía `createRowTransitionDialog(store, screenKey)`.
 *
 * Recolección (worklist) NO usa este helper: su `confirmDialog` diverge
 * (ramas backend/mock + fallback a la selección masiva).
 */
export class RowTransitionDialog {
  readonly activeTransition = signal<Transition | null>(null);
  readonly rowMenuSamples = signal<Tube[]>([]);

  constructor(
    private readonly store: Store,
    private readonly screen: ScreenKey,
  ) {}

  /** Abre el diálogo para una fila, resolviendo la Transition desde la config. */
  open(key: RowActionKey, row: Tube): void {
    const t = SCREENS[this.screen].targets.find((tt) => tt.key === key);
    if (!t) return;
    this.rowMenuSamples.set([row]);
    this.activeTransition.set(t);
  }

  cancel(): void {
    this.activeTransition.set(null);
    this.rowMenuSamples.set([]);
  }

  confirm(payload: { dest: TransitionDest; note: string }): void {
    const t = this.activeTransition();
    const tubes = this.rowMenuSamples();
    this.activeTransition.set(null);
    this.rowMenuSamples.set([]);
    if (!t || tubes.length === 0) return;
    const labelIds = tubes.flatMap((tube) => tube.labelIds ?? []);
    if (labelIds.length === 0) return;
    this.store.dispatch(transitionLabels({
      labelIds,
      transitionKey: t.key,
      reason: payload.note || undefined,
    }));
  }

  /** Muestras del diálogo, para el binding `[samples]`. */
  readonly samples = computed<Sample[]>(() => this.rowMenuSamples());
}

export function createRowTransitionDialog(store: Store, screen: ScreenKey): RowTransitionDialog {
  return new RowTransitionDialog(store, screen);
}
