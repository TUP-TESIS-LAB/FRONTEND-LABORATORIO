import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';

@Component({
  selector: 'ui-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent],
  template: `
    <div class="ui-admin-shell">
      <ui-sidebar class="ui-show-desktop ui-admin-shell__sidebar" />

      <p-drawer
        [(visible)]="drawerOpen"
        position="left"
        [modal]="true"
        styleClass="ui-admin-shell__mobile-drawer">
        <ui-sidebar (itemClick)="drawerOpen.set(false)" />
      </p-drawer>

      <div class="ui-admin-shell__main">
        <ui-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="ui-admin-shell__content">
          <router-outlet />
        </main>
      </div>
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
    :host ::ng-deep .ui-admin-shell__mobile-drawer {
      width: 280px;
    }
  `],
})
export class AdminShellComponent {
  readonly drawerOpen = signal(false);
}
