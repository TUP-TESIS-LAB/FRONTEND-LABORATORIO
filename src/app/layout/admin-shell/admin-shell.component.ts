import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent],
  template: `
    <div class="admin-shell">
      <!-- Sidebar desktop -->
      <app-sidebar class="ui-show-desktop admin-shell__sidebar" />

      <!-- Drawer mobile -->
      <p-drawer [(visible)]="drawerOpen" position="left" [modal]="true">
        <app-sidebar (itemClick)="drawerOpen.set(false)" />
      </p-drawer>

      <!-- Main content -->
      <div class="admin-shell__main">
        <app-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="admin-shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .admin-shell__sidebar {
      width: var(--ds-sidebar-w);
      flex-shrink: 0;
      border-right: 1px solid var(--ds-surface);
    }
    .admin-shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .admin-shell__content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
      background: var(--ds-bg);
    }
    @media (max-width: 767px) {
      .admin-shell__content { padding: var(--space-4); }
    }
  `],
})
export class AdminShellComponent {
  readonly drawerOpen = signal(false);
}
