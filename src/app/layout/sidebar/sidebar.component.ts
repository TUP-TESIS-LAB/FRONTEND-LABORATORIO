import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  moduleKey?: ModuleKey;
}

const CORE_ITEMS: NavItem[] = [
  { label: 'Empresa',    icon: 'pi pi-building',   path: '/empresa' },
  { label: 'Sucursales', icon: 'pi pi-map-marker',  path: '/sucursales' },
  { label: 'Analítica',  icon: 'pi pi-flask',       path: '/analitica' },
];

const ACTIVABLE_ITEMS: NavItem[] = [
  { label: 'Turnos',     icon: 'pi pi-calendar',   path: '/turnos',     moduleKey: ModuleKey.Turnos },
  { label: 'Financiero', icon: 'pi pi-wallet',      path: '/financiero', moduleKey: ModuleKey.Financiero },
  { label: 'Médicos',    icon: 'pi pi-user-plus',   path: '/medicos',    moduleKey: ModuleKey.Medicos },
  { label: 'Stock',      icon: 'pi pi-box',          path: '/stock',      moduleKey: ModuleKey.Stock },
];

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="ui-sidebar">
      <div class="ui-sidebar__logo">
        <i class="pi pi-flask" style="font-size: 24px; color: var(--brand-primary)"></i>
        <span class="ui-sidebar__brand">LabCore</span>
      </div>

      <ul class="ui-sidebar__menu">
        @for (item of coreItems; track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="ui-sidebar__item--active"
               class="ui-sidebar__item" (click)="itemClick.emit()">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }

        @if (activableItems().length > 0) {
          <li class="ui-sidebar__separator"><span>Módulos</span></li>
        }

        @for (item of activableItems(); track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="ui-sidebar__item--active"
               class="ui-sidebar__item" (click)="itemClick.emit()">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .ui-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
      overflow-y: auto;
    }
    .ui-sidebar__logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--ds-surface);
    }
    .ui-sidebar__brand { font-weight: 700; font-size: 16px; color: var(--ds-text); }
    .ui-sidebar__menu { list-style: none; margin: 0; padding: var(--space-3) 0; }
    .ui-sidebar__menu li { padding: 0 var(--space-2); }
    .ui-sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: 8px;
      color: var(--ds-text-muted);
      text-decoration: none;
      font-size: 14px;
      transition: background 150ms, color 150ms;
      min-height: var(--ds-touch-target);
    }
    .ui-sidebar__item:hover { background: var(--ds-surface); color: var(--ds-text); }
    .ui-sidebar__item--active { background: color-mix(in srgb, var(--brand-primary) 10%, transparent); color: var(--brand-primary); font-weight: 600; }
    .ui-sidebar__separator {
      padding: var(--space-4) var(--space-5) var(--space-2);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ds-text-muted);
    }
  `],
})
export class SidebarComponent {
  readonly itemClick = output<void>();
  private readonly registry = inject(ModuleRegistry);

  protected readonly coreItems = CORE_ITEMS;
  protected readonly activableItems = () =>
    ACTIVABLE_ITEMS.filter(i => !i.moduleKey || this.registry.isActive(i.moduleKey));
}
