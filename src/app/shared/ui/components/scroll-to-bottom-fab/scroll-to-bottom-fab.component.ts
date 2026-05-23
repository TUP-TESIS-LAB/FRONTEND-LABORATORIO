import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  OnInit, inject, signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Floating action button that appears after a small scroll (~100px) and
 * jumps to the bottom of the scrollable container when clicked.
 *
 * Architecture detail: the admin shell uses an inner `overflow-y: auto`
 * container (`.ui-admin-shell__content`), not window-level scrolling. So
 * we walk up from the host to find the nearest scrollable ancestor and
 * listen to scroll events on THAT element (NOT window). If nothing
 * scrollable is found above us, we fall back to window/document.
 *
 * Threshold is intentionally low (100px) so the FAB shows up as soon as
 * the user starts scrolling — natural "I'm browsing a list" signal.
 *
 * Usage: drop `<ui-scroll-to-bottom-fab />` at the end of any page template.
 */
@Component({
  selector: 'ui-scroll-to-bottom-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    @if (visible()) {
      <p-button
        icon="pi pi-arrow-down"
        rounded
        severity="secondary"
        styleClass="ui-fab-shadow"
        ariaLabel="Ir al final"
        (onClick)="scrollToBottom()"
        class="fixed bottom-6 right-6 z-50" />
    }
  `,
  styles: [`
    :host ::ng-deep .ui-fab-shadow { box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
  `],
})
export class ScrollToBottomFabComponent implements OnInit {
  readonly visible = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly SHOW_AFTER_PX = 100;

  /** The element whose scroll we're listening to. Null until we resolve in ngOnInit. */
  private scrollEl: HTMLElement | Window | null = null;

  ngOnInit(): void {
    this.scrollEl = this.findScrollableAncestor(this.host.nativeElement) ?? window;
    const handler = () => this.checkScroll();
    this.scrollEl.addEventListener('scroll', handler, { passive: true });
    this.destroyRef.onDestroy(() => this.scrollEl?.removeEventListener('scroll', handler));
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

  private checkScroll(): void {
    const top = this.scrollEl instanceof Window
      ? window.scrollY
      : (this.scrollEl as HTMLElement).scrollTop;
    this.visible.set(top > ScrollToBottomFabComponent.SHOW_AFTER_PX);
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
