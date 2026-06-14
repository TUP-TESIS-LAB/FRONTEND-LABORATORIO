import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'emp-empresa-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header heading="Empresa" />

    <nav class="emp-dashboard__tabs" role="tablist">
      <a routerLink="usuarios" routerLinkActive="is-active" role="tab">Usuarios</a>
      <a routerLink="white-label" routerLinkActive="is-active" role="tab">White-label</a>
      <a routerLink="modulos" routerLinkActive="is-active" role="tab">Módulos</a>
      <a routerLink="fiscal" routerLinkActive="is-active" role="tab">Fiscal</a>
      <a routerLink="email" routerLinkActive="is-active" role="tab">Email</a>
    </nav>

    <section class="emp-dashboard__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    /* El padding exterior lo aporta el .ui-admin-shell__content (var(--space-6)).
       El shell NO agrega el suyo para alinear el título con el resto de pantallas. */
    :host { display: block; }
    .emp-dashboard__tabs {
      display: flex; gap: var(--space-2);
      border-bottom: 1px solid var(--ds-surface);
      overflow-x: auto; margin-bottom: var(--space-5);
    }
    .emp-dashboard__tabs a {
      padding: var(--space-3) var(--space-4); color: var(--ds-text-muted);
      text-decoration: none; border-bottom: 2px solid transparent;
      white-space: nowrap;
    }
    .emp-dashboard__tabs a.is-active {
      color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600;
    }
    .emp-dashboard__body { display: block; }
  `],
})
export class EmpresaDashboardComponent {}
