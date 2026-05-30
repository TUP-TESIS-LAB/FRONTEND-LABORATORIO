import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'suc-sucursales-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="suc-shell__header">
      <small class="ui-text-muted">Gestión</small>
      <h1><i class="pi pi-building"></i> Sucursales</h1>
    </header>

    <nav class="suc-shell__tabs" role="tablist">
      <a routerLink="configuracion" routerLinkActive="is-active" role="tab">Sucursales</a>
      <a routerLink="empleados" routerLinkActive="is-active" role="tab">Empleados</a>
    </nav>

    <section class="suc-shell__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    .suc-shell__header { padding: var(--space-6) var(--space-6) 0; }
    .suc-shell__header h1 { margin: var(--space-1) 0 var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
    .suc-shell__tabs { display: flex; gap: var(--space-2); padding: 0 var(--space-6); border-bottom: 1px solid var(--ds-surface); overflow-x: auto; }
    .suc-shell__tabs a { padding: var(--space-3) var(--space-4); color: var(--ds-text-muted); text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; }
    .suc-shell__tabs a.is-active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600; }
    .suc-shell__body { padding: var(--space-6); }
  `],
})
export class SucursalesShellComponent {}
