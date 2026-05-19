import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaasSidebarComponent } from './saas-sidebar/saas-sidebar.component';
import { SaasTopbarComponent } from './saas-topbar/saas-topbar.component';

@Component({
  selector: 'saas-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SaasSidebarComponent, SaasTopbarComponent],
  template: `
    <saas-topbar />
    <div class="saas-shell__body">
      <saas-sidebar />
      <main class="saas-shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: #1a1b3a; color: #e2e8f0; }
    .saas-shell__body { display: flex; flex: 1; }
    .saas-shell__main { flex: 1; padding: 24px; overflow-x: hidden; }
  `],
})
export class SaasShellComponent {}
