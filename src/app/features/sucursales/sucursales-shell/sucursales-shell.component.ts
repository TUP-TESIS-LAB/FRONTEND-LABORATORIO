import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'suc-sucursales-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header heading="Sucursales" />

    <nav class="suc-shell__tabs" role="tablist">
      <a routerLink="configuracion" routerLinkActive="is-active" role="tab">Sucursales</a>
      <a routerLink="empleados" routerLinkActive="is-active" role="tab">Empleados</a>
    </nav>

    <section class="suc-shell__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    /* El padding exterior lo aporta el .ui-admin-shell__content (var(--space-6)).
       El shell NO agrega el suyo para que el título quede a la misma altura que
       el resto de las pantallas. */
    :host { display: block; }
    .suc-shell__tabs { display: flex; gap: var(--space-2); border-bottom: 1px solid var(--ds-surface); overflow-x: auto; margin-bottom: var(--space-5); }
    .suc-shell__tabs a { padding: var(--space-3) var(--space-4); color: var(--ds-text-muted); text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; }
    .suc-shell__tabs a.is-active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600; }
    .suc-shell__body { display: block; }
  `],
})
export class SucursalesShellComponent {}
