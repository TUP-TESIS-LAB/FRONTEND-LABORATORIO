import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

interface Crumb {
  label: string;
  url: string;
}

/**
 * Migas de navegación derivadas del árbol de rutas activas.
 *
 * Recorre las rutas activas leyendo `route.snapshot.data['breadcrumb']` y
 * recalcula en cada `NavigationEnd`. No expone internals: solo el label que
 * cada ruta declara explícitamente.
 */
@Component({
  selector: 'ui-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length) {
      <nav class="ui-breadcrumb" aria-label="Migas de navegación">
        @for (c of crumbs(); track c.url; let last = $last) {
          <span class="ui-breadcrumb__item" [class.ui-breadcrumb__item--current]="last">{{ c.label }}</span>
          @if (!last) {
            <i class="pi pi-angle-right ui-breadcrumb__sep" aria-hidden="true"></i>
          }
        }
      </nav>
    }
  `,
  styles: [`
    .ui-breadcrumb {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .85rem;
      color: var(--ds-text-muted);
    }
    .ui-breadcrumb__item--current {
      color: var(--ds-text);
      font-weight: 600;
    }
    .ui-breadcrumb__sep {
      font-size: .7rem;
      opacity: .6;
    }
  `],
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly crumbs = signal<Crumb[]>([]);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.crumbs.set(this.build()));
    this.crumbs.set(this.build());
  }

  private build(): Crumb[] {
    const out: Crumb[] = [];
    let route: ActivatedRoute | null = this.route.root;
    let url = '';

    while (route) {
      // route.snapshot puede ser undefined durante el bootstrap / navegación inicial
      // (el componente se construye antes de que el árbol de rutas tenga snapshots).
      const segment = route.snapshot?.url.map((s) => s.path).join('/') ?? '';
      if (segment) {
        url += `/${segment}`;
      }
      const label = route.snapshot?.data?.['breadcrumb'];
      if (typeof label === 'string' && label) {
        out.push({ label, url });
      }
      route = route.firstChild;
    }

    return out;
  }
}
