import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  OnInit, inject, signal,
} from '@angular/core';

/**
 * Floating action button that jumps to the bottom of the scrollable container
 * the user is currently scrolling.
 *
 * Why the implementation looks like this:
 *
 * 1. The admin shell scrolls inside `.ui-admin-shell__content`, not window.
 *    So we can't use `window.scrollY` or `@HostListener('window:scroll')`.
 *
 * 2. The component mounts BEFORE the list renders. If we cache the scroll
 *    target in ngOnInit, the candidate container's scrollHeight equals its
 *    clientHeight at that moment, so the walk-up skips it. By the time the
 *    table has 100 rows, our cached reference is stale (we fell back to
 *    window). That's why caching breaks the click.
 *
 *    Solution: don't cache. Re-resolve the scroll target every time —
 *    on each scroll event (cheap, just reads the event target) and on
 *    click (walks the DOM once, ~3-4 nodes).
 *
 * 3. Visibility: the FAB shows up as soon as the user scrolls AT ALL
 *    (scrollTop > 0). No pixel threshold. Listener uses `capture: true`
 *    on document so any scrolling element triggers it.
 *
 * Native <button> + CSS in component because PrimeNG's <p-button> wraps
 * the element in its own template and positional classes on the host
 * don't reliably reach the inner button.
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
    .ui-fab:active { transform: translateY(0); }
    .ui-fab i { font-size: 18px; }
  `],
})
export class ScrollToBottomFabComponent implements OnInit {
  readonly visible = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Capture phase = catch scroll on ANY descendant of document, not just window.
    const handler = (e: Event) => {
      const top = this.scrollTopOf(e.target);
      this.visible.set(top > 0);
    };
    document.addEventListener('scroll', handler, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('scroll', handler, true));
  }

  private scrollTopOf(target: EventTarget | null): number {
    if (target instanceof HTMLElement) return target.scrollTop;
    return window.scrollY || document.documentElement.scrollTop;
  }

  /** Walk up the DOM from the host looking for the closest ancestor that actually scrolls. */
  private findScrollableAncestor(): HTMLElement | null {
    let el: HTMLElement | null = this.host.nativeElement.parentElement;
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
    // Re-resolve on every click. The list might have grown since mount.
    const target = this.findScrollableAncestor();
    if (target) {
      target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  }
}
