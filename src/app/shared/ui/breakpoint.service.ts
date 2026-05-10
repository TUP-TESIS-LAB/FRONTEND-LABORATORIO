import { Injectable, signal } from '@angular/core';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  readonly current = signal<Breakpoint>(this.detect());

  constructor() {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const mqTablet = window.matchMedia('(min-width: 768px)');
    const update = () => this.current.set(this.detect());
    mq.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
  }

  private detect(): Breakpoint {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth >= 1024) return 'desktop';
    if (window.innerWidth >= 768) return 'tablet';
    return 'mobile';
  }

  isMobile(): boolean { return this.current() === 'mobile'; }
  isDesktop(): boolean { return this.current() === 'desktop'; }
}
