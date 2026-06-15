import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'suc-sucursales-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header heading="Sucursales y empleados">
      @if (onEmpleados()) {
        <p-button label="Nuevo empleado" (onClick)="nuevoEmpleado()" />
      } @else {
        <p-button label="Nueva sucursal" (onClick)="nuevaSucursal()" />
      }
    </ui-page-header>

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
export class SucursalesShellComponent {
  private readonly router = inject(Router);

  // El botón de acción del header depende de la tab activa: "Nuevo empleado" en
  // la tab Empleados, "Nueva sucursal" en la de Sucursales (default).
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly onEmpleados = computed(() => this.url().includes('/empleados'));

  nuevaSucursal(): void {
    this.router.navigate(['/sucursales/configuracion/nueva']);
  }

  nuevoEmpleado(): void {
    this.router.navigate(['/sucursales/empleados/nuevo']);
  }
}
