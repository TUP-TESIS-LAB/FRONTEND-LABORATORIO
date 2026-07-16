import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';
import { ChangePasswordDrawerComponent } from '@features/profile/components/change-password-drawer/change-password-drawer.component';
import { LogoutConfirmComponent } from '@features/profile/components/logout-confirm/logout-confirm.component';
import { NotificationHostComponent } from '@core/components/notification-host/notification-host.component';
import { AsistenteAyudaComponent } from '@shared/asistente-ayuda/asistente-ayuda.component';

@Component({
  selector: 'ui-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent, ChangePasswordDrawerComponent, LogoutConfirmComponent, NotificationHostComponent, AsistenteAyudaComponent],
  template: `
    <div class="ui-admin-shell">
      <ui-sidebar class="ui-admin-shell__sidebar"
                  [class.ui-admin-shell__sidebar--collapsed]="collapsed()"
                  [collapsed]="collapsed()" />

      <p-drawer
        [(visible)]="drawerOpen"
        position="left"
        [modal]="true"
        styleClass="ui-admin-shell__mobile-drawer">
        <ui-sidebar (itemClick)="drawerOpen.set(false)" />
      </p-drawer>

      <div class="ui-admin-shell__main">
        <ui-topbar (menuToggle)="onMenuToggle()" />
        <main class="ui-admin-shell__content">
          <router-outlet />
        </main>
      </div>

      <ui-change-password-drawer />
      <ui-logout-confirm />
      <app-notification-host />
      <app-asistente-ayuda />
    </div>
  `,
  styles: [`
    .ui-admin-shell {
      display: flex;
      height: 100dvh;
      overflow: hidden;
      background: var(--ds-bg);
    }
    .ui-admin-shell__sidebar {
      width: var(--ds-sidebar-w);
      flex-shrink: 0;
      transition: width .2s ease;
    }
    .ui-admin-shell__sidebar--collapsed {
      width: var(--ds-sidebar-w-collapsed, 64px);
    }
    @media (max-width: 767px) {
      .ui-admin-shell__sidebar { display: none; }
    }
    .ui-admin-shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .ui-admin-shell__content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
      background: var(--ds-bg);
    }
    @media (max-width: 767px) {
      .ui-admin-shell__content { padding: var(--space-4); }
    }

    :host ::ng-deep .ui-admin-shell__mobile-drawer .p-drawer-content {
      padding: 0;
      background: var(--brand-shell-bg);
    }
    /* El header por defecto del p-drawer venía blanco y con padding grande — se
       veía un bloque blanco arriba de la X. Lo integramos al fondo oscuro del
       shell y lo compactamos (la X clara, alineada a la derecha). */
    :host ::ng-deep .ui-admin-shell__mobile-drawer .p-drawer-header {
      background: var(--brand-shell-bg);
      padding: var(--space-2) var(--space-3);
      min-height: 0;
    }
    :host ::ng-deep .ui-admin-shell__mobile-drawer .p-drawer-close-button {
      color: rgba(255,255,255,.7);
    }
    :host ::ng-deep .ui-admin-shell__mobile-drawer .p-drawer-close-button:hover {
      color: #fff;
      background: rgba(255,255,255,.1);
    }
    :host ::ng-deep .ui-admin-shell__mobile-drawer {
      width: 280px;
    }
  `],
})
export class AdminShellComponent {
  private static readonly COLLAPSED_KEY = 'ui-admin-shell.sidebar-collapsed';

  readonly drawerOpen = signal(false);
  readonly collapsed  = signal(this.readCollapsed());

  onMenuToggle(): void {
    // Desktop: colapsa/expande el sidebar. Mobile: abre/cierra el drawer.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      this.drawerOpen.update(v => !v);
    } else {
      this.collapsed.update(v => !v);
      this.writeCollapsed(this.collapsed());
    }
  }

  private readCollapsed(): boolean {
    try {
      return typeof localStorage !== 'undefined'
        && localStorage.getItem(AdminShellComponent.COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  private writeCollapsed(value: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AdminShellComponent.COLLAPSED_KEY, value ? '1' : '0');
      }
    } catch {
      // ignore persistence failures (private mode, etc.)
    }
  }
}
