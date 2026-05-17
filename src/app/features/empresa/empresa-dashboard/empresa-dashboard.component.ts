import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'emp-empresa-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="emp-dashboard__header">
      <small class="ui-text-muted">Gestión</small>
      <h1><i class="pi pi-building"></i> Empresa</h1>
    </header>

    <nav class="emp-dashboard__tabs" role="tablist">
      <a routerLink="usuarios" routerLinkActive="is-active" role="tab">Usuarios</a>
      <a routerLink="roles" routerLinkActive="is-active" role="tab">Roles</a>
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
    .emp-dashboard__header { padding: var(--space-6) var(--space-6) 0; }
    .emp-dashboard__header h1 { margin: var(--space-1) 0 var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
    .emp-dashboard__tabs {
      display: flex; gap: var(--space-2); padding: 0 var(--space-6);
      border-bottom: 1px solid var(--ds-surface);
      overflow-x: auto;
    }
    .emp-dashboard__tabs a {
      padding: var(--space-3) var(--space-4); color: var(--ds-text-muted);
      text-decoration: none; border-bottom: 2px solid transparent;
      white-space: nowrap;
    }
    .emp-dashboard__tabs a.is-active {
      color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600;
    }
    .emp-dashboard__body { padding: var(--space-6); }
  `],
})
export class EmpresaDashboardComponent {}
