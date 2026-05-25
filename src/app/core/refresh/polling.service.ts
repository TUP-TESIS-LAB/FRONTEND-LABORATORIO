import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, Subscription, fromEvent, interval, merge } from 'rxjs';
import { startWith, switchMap, tap } from 'rxjs/operators';

export interface PollingOptions {
  /** Identificador único de la pantalla / consumidor — útil para logs. */
  key: string;
  /** Intervalo entre polls en ms. Default 5000 — el estándar del proyecto. */
  intervalMs?: number;
  /** Pausar polling cuando `document.hidden === true`. Default true. */
  pauseOnHidden?: boolean;
  /**
   * Función que dispara una pasada de polling. Debe devolver un Observable que
   * complete (o emita y termine). Si tarda más que `intervalMs`, el próximo tick
   * cancela al anterior (switchMap).
   */
  poll: () => Observable<unknown>;
}

export interface PollingHandle {
  /** Cancela el polling y libera recursos. */
  stop(): void;
  /** Dispara un poll inmediato (fuera del schedule). */
  pokeNow(): void;
  /** Pausar/reanudar manualmente (ej. mientras un drawer está abierto). */
  setActive(active: boolean): void;
}

/**
 * Servicio que centraliza el polling con visibility-pausing del proyecto
 * (CLAUDE.md regla #5). Pensado para ser inyectado en pantallas que necesiten
 * refresco; la lógica de polling NO vive en los componentes.
 */
@Injectable({ providedIn: 'root' })
export class PollingService {
  startPolling(opts: PollingOptions): PollingHandle {
    const intervalMs = opts.intervalMs ?? 5000;
    const pauseOnHidden = opts.pauseOnHidden ?? true;

    const manualActive$ = new BehaviorSubject<boolean>(true);
    const visibilityActive$ = new BehaviorSubject<boolean>(
      pauseOnHidden ? !document.hidden : true,
    );
    const poke$ = new Subject<void>();

    const visibilitySub: Subscription | null = pauseOnHidden
      ? fromEvent(document, 'visibilitychange').subscribe(() => {
          const visible = !document.hidden;
          visibilityActive$.next(visible);
          if (visible) poke$.next();
        })
      : null;

    // El stream "activo" es el AND entre la pausa manual y la visibility.
    const active$ = new BehaviorSubject<boolean>(true);
    const computeActive = () => active$.next(manualActive$.value && visibilityActive$.value);
    const manualSub = manualActive$.subscribe(() => computeActive());
    const visSub = visibilityActive$.subscribe(() => computeActive());

    const pollSub = active$
      .pipe(
        switchMap((active) =>
          active
            ? merge(interval(intervalMs).pipe(startWith(0)), poke$)
            : EMPTY,
        ),
        switchMap(() => opts.poll()),
        // Swallow errors silently — el caller gestiona errores via su propio flujo
        // (typicamente NgRx effect). Si el poll() tira, el polling no debería detenerse.
        tap({ error: () => void 0 }),
      )
      .subscribe({ error: () => void 0 });

    return {
      stop: () => {
        pollSub.unsubscribe();
        manualSub.unsubscribe();
        visSub.unsubscribe();
        visibilitySub?.unsubscribe();
        manualActive$.complete();
        visibilityActive$.complete();
        active$.complete();
        poke$.complete();
      },
      pokeNow: () => poke$.next(),
      setActive: (active: boolean) => manualActive$.next(active),
    };
  }
}
