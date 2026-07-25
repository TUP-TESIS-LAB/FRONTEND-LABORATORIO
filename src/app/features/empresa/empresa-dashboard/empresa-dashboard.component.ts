import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { UsuariosCreateBus } from '../pages/usuarios/usuarios-create.bus';
import { InformePdfSaveBus } from '../pages/informe-pdf/informe-pdf-save.bus';

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
      @if (onInformePdf()) {
        @if (reportBus.dirty()) {
          <span class="emp-dashboard__save-hint"><span class="dot"></span>Cambios sin guardar</span>
        }
        <p-button label="Guardar cambios" severity="primary"
                  [disabled]="!reportBus.dirty()" (onClick)="reportBus.save()" />
      }
    </ui-page-header>

    <nav class="emp-dashboard__tabs" role="tablist">
      <a routerLink="usuarios" routerLinkActive="is-active" role="tab">Usuarios</a>
      <a routerLink="secciones" routerLinkActive="is-active" role="tab">Secciones</a>
      @if (derivacionesActiva()) {
        <a routerLink="derivaciones" routerLinkActive="is-active" role="tab">Derivaciones</a>
      }
      <a routerLink="white-label" routerLinkActive="is-active" role="tab">White-label</a>
      <a routerLink="fiscal" routerLinkActive="is-active" role="tab">Fiscal</a>
      <a routerLink="email" routerLinkActive="is-active" role="tab">Email</a>
      <a routerLink="informe-pdf" routerLinkActive="is-active" role="tab">Informe PDF</a>
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
    .emp-dashboard__save-hint {
      display: inline-flex; align-items: center; gap: var(--space-2);
      font-size: 13px; color: var(--ds-warning); font-weight: 500;
    }
    .emp-dashboard__save-hint .dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--ds-warning);
    }
  `],
})
export class EmpresaDashboardComponent {
  protected readonly bus = inject(UsuariosCreateBus);
  protected readonly reportBus = inject(InformePdfSaveBus);
  private readonly router = inject(Router);
  private readonly modules = inject(ModuleRegistry);

  protected readonly derivacionesActiva = computed(() => this.modules.isActive(ModuleKey.Derivaciones));

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
  protected readonly onInformePdf = computed(() => this.url().includes('/informe-pdf'));
}
