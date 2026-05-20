import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'saas-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="saas-sidebar">
      <nav>
        <a routerLink="/saas" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="saas-sidebar__item">
          <i class="pi pi-chart-bar"></i><span>Dashboard</span>
        </a>
        <a routerLink="/saas/tenants" routerLinkActive="active" class="saas-sidebar__item">
          <i class="pi pi-building"></i><span>Tenants</span>
        </a>
      </nav>
    </aside>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .saas-sidebar {
      width: 220px; min-height: calc(100vh - 48px);
      background: #0f0c29; padding: 16px 0; color: #c7d2fe;
    }
    nav { display: flex; flex-direction: column; gap: 4px; }
    .saas-sidebar__item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; color: #c7d2fe; text-decoration: none;
      font-size: 13px; border-left: 2px solid transparent;
    }
    .saas-sidebar__item:hover { background: rgba(255,255,255,.04); }
    .saas-sidebar__item.active {
      background: rgba(251,191,36,.12); color: #fde68a;
      border-left-color: #fbbf24;
    }
    .saas-sidebar__item i { width: 16px; font-size: 14px; }
  `],
})
export class SaasSidebarComponent {}
