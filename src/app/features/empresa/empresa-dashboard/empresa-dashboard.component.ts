import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { UsuariosCreateBus } from '../pages/usuarios/usuarios-create.bus';

@Component({
  selector: 'emp-empresa-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header heading="Empresa">
      @if (onUsuarios()) {
        <p-button label="Nuevo usuario" severity="primary" (onClick)="bus.requestCreate()" />
      }
    </ui-page-header>

    <nav class="emp-dashboard__tabs" role="tablist">
      <a routerLink="usuarios" routerLinkActive="is-active" role="tab">Usuarios</a>
      <a routerLink="white-label" routerLinkActive="is-active" role="tab">White-label</a>
      <a routerLink="fiscal" routerLinkActive="is-active" role="tab">Fiscal</a>
      <a routerLink="email" routerLinkActive="is-active" role="tab">Email</a>
      <a routerLink="notificaciones" routerLinkActive="is-active" role="tab">Notificaciones</a>
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
export class EmpresaDashboardComponent {
  protected readonly bus = inject(UsuariosCreateBus);
  private readonly router = inject(Router);

  // El botón de acción del header depende de la tab activa; se actualiza con cada
  // navegación. "Nuevo usuario" sólo se muestra en la tab Usuarios.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly onUsuarios = computed(() => this.url().includes('/usuarios'));
}
