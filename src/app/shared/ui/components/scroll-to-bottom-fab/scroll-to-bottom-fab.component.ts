import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  OnInit, inject, signal,
} from '@angular/core';

/**
 * Floating action button that jumps to the bottom of the scrollable container.
 *
 * Currently rendering **always visible** (no scroll-based hiding) to debug
 * positioning. To re-enable scroll-triggered visibility set `alwaysVisible`
 * to `false` and uncomment the visibility logic in `ngOnInit`.
 *
 * Architecture: the admin shell uses an inner `overflow-y: auto` container
 * (`.ui-admin-shell__content`), not window-level scrolling. We walk up from
 * the host to find the nearest scrollable ancestor and use it for
 * `scrollToBottom()`. If nothing scrollable is found we fall back to window.
 *
 * Why a native `<button>` instead of `<p-button>`: PrimeNG wraps p-button in
 * its own template, and positional Tailwind classes on the host don't always
 * apply to the inner rendered element. Native button + inline styles gives
 * us a deterministic 56×56 pill in the bottom-right corner.
 */
@Component({
  selector: 'ui-scroll-to-bottom-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button type="button"
              class="ui-fab"
              aria-label="Ir al final"
              (click)="scrollToBottom()">
        <i class="pi pi-arrow-down"></i>
      </button>
    }
  `,
  styles: [`
    :host { display: contents; }
    .ui-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: var(--brand-secondary, #1976d2);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      transition: background 0.15s, transform 0.15s;
    }
    .ui-fab:hover {
      background: var(--brand-primary, #1565c0);
      transform: translateY(-2px);
    }
    .ui-fab:active {
      transform: translateY(0);
    }
    .ui-fab i {
      font-size: 18px;
    }
  `],
})
export class ScrollToBottomFabComponent implements OnInit {
  /** Always on for now — debugging visibility. */
  readonly visible = signal(true);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** The element whose scroll we'll target. Resolved in ngOnInit. */
  private scrollEl: HTMLElement | Window | null = null;

  ngOnInit(): void {
    this.scrollEl = this.findScrollableAncestor(this.host.nativeElement) ?? window;
  }

  /** Walk up the DOM looking for the closest ancestor with overflow-y auto/scroll. */
  private findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
    let el: HTMLElement | null = start?.parentElement ?? null;
    while (el && el !== document.body) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  scrollToBottom(): void {
    if (this.scrollEl instanceof Window) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else if (this.scrollEl) {
      const el = this.scrollEl as HTMLElement;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }
}
