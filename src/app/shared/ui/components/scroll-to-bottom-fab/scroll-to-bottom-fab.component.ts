import {
  ChangeDetectionStrategy, Component, DestroyRef, HostListener,
  inject, signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Floating action button that appears after scrolling down ~400px and jumps
 * to the bottom of the page when clicked. Use on any page with long lists
 * or tables to give the user a fast "jump to end" affordance.
 *
 * Usage: drop `<ui-scroll-to-bottom-fab />` at the end of any page template.
 * The FAB positions itself fixed in the bottom-right corner via Tailwind.
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
export class ScrollToBottomFabComponent {
  readonly visible = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  @HostListener('window:scroll')
  onScroll(): void {
    this.visible.set(window.scrollY > 400);
  }

  scrollToBottom(): void {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }
}
