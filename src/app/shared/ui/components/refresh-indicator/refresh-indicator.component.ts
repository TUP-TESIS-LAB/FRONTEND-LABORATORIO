import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

/**
 * Pill compartido del estándar de polling. Renderiza:
 *
 *  - Punto pulsante verde cuando está activo, gris cuando pausado.
 *  - Texto "Actualizado hace Xs" basado en `lastRefreshAt` (incluye 304).
 *  - "Pausado" cuando `paused === true`.
 *
 * El conteo de segundos se recalcula con un interval interno de 1s.
 */
@Component({
  selector: 'ui-refresh-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-refresh-pill" [class.is-paused]="paused()">
      <span class="ui-refresh-pill__dot" aria-hidden="true"></span>
      <span class="ui-refresh-pill__text">{{ text() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .ui-refresh-pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(34,197,94,.08);
      color: #15803d;
      font-size: 12px; font-weight: 500;
      border: 1px solid rgba(34,197,94,.2);
    }
    .ui-refresh-pill.is-paused {
      background: rgba(148,163,184,.12);
      color: #475569;
      border-color: rgba(148,163,184,.3);
    }
    .ui-refresh-pill__dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      animation: refresh-pulse 1.6s ease-in-out infinite;
    }
    .ui-refresh-pill.is-paused .ui-refresh-pill__dot {
      background: #94a3b8;
      animation: none;
    }
    @keyframes refresh-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .5; transform: scale(.85); }
    }
  `],
})
export class RefreshIndicatorComponent {
  readonly lastRefreshAt = input<Date | null>(null);
  readonly paused = input<boolean>(false);
  readonly intervalMs = input<number>(5000);

  private readonly tick = signal(0);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tick.update((n) => n + 1));
  }

  readonly text = computed(() => {
    // Read tick to retrigger every second.
    this.tick();
    if (this.paused()) return 'Pausado';
    const last = this.lastRefreshAt();
    if (!last) return 'Esperando primer dato...';
    const seconds = Math.max(0, Math.round((Date.now() - last.getTime()) / 1000));
    if (seconds < 5) return 'Actualizado recién';
    if (seconds < 60) return `Actualizado hace ${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `Actualizado hace ${minutes} min`;
  });
}
