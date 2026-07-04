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
      width: 220px; min-height: 100%;
      background: var(--saas-surface, #fff);
      border-right: 1px solid var(--saas-border, #e6e8ef);
      padding: var(--space-3, 12px) var(--space-2, 8px);
    }
    nav { display: flex; flex-direction: column; gap: 2px; }
    .saas-sidebar__item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; color: var(--saas-text-muted, #6b7280); text-decoration: none;
      font-size: 13px; font-weight: 500; border-radius: 8px;
      transition: background 120ms ease, color 120ms ease;
    }
    .saas-sidebar__item:hover { background: var(--saas-surface-alt, #f3f4f6); color: var(--saas-text, #1a1a2e); }
    .saas-sidebar__item.active {
      background: var(--saas-accent-tint, rgba(99,102,241,.10));
      color: var(--saas-accent-strong, #4f46e5);
      font-weight: 600;
    }
    .saas-sidebar__item i { width: 18px; font-size: 15px; }
  `],
})
export class SaasSidebarComponent {}
