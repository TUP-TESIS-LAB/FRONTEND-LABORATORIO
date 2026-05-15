import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NAV_SECTIONS, NavItem, NavSection } from './sidebar.nav';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive],
  template: `
    <nav class="ui-sidebar" aria-label="Navegación principal">
      @for (section of visibleSections(); track section.label; let last = $last) {
        <div class="ui-sidebar__section">
          <div class="ui-sidebar__section-label">{{ section.label }}</div>
          @for (item of section.items; track item.label) {
            @if (item.kind === 'link') {
              <a
                [routerLink]="item.path"
                routerLinkActive="ui-sidebar__item--active"
                class="ui-sidebar__item"
                (click)="itemClick.emit()">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                <span class="ui-sidebar__label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ui-sidebar__badge"
                        [ngClass]="'ui-sidebar__badge--' + item.badge.tone">
                    {{ item.badge.text }}
                  </span>
                }
                @if (item.chip) {
                  <span class="ui-sidebar__chip">{{ item.chip }}</span>
                }
              </a>
            } @else {
              <button
                type="button"
                class="ui-sidebar__item ui-sidebar__item--expandable"
                [class.ui-sidebar__item--active]="isGroupActive(item)"
                [class.ui-sidebar__item--expanded]="isExpanded(item.label)"
                (click)="toggleExpanded(item.label)">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                <span class="ui-sidebar__label">{{ item.label }}</span>
                <i class="pi pi-chevron-down ui-sidebar__chevron"></i>
              </button>
              <div class="ui-sidebar__sub" [class.ui-sidebar__sub--open]="isExpanded(item.label)">
                @for (child of item.children; track child.path) {
                  <a
                    [routerLink]="child.path"
                    routerLinkActive="ui-sidebar__subitem--active"
                    class="ui-sidebar__subitem"
                    (click)="itemClick.emit()">
                    <span class="ui-sidebar__dot"></span>
                    <span class="ui-sidebar__label">{{ child.label }}</span>
                  </a>
                }
              </div>
            }
          }
        </div>
        @if (!last) {
          <div class="ui-sidebar__divider"></div>
        }
      }
    </nav>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .ui-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--brand-shell-bg);
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--space-2) 0;
    }
    .ui-sidebar::-webkit-scrollbar { width: 4px; }
    .ui-sidebar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.2);
      border-radius: 2px;
    }

    .ui-sidebar__section { padding: var(--space-2) 0 0; }
    .ui-sidebar__section-label {
      padding: 0 var(--space-3) var(--space-1);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .08em;
      color: rgba(255,255,255,.4);
      text-transform: uppercase;
    }

    .ui-sidebar__divider {
      height: 1px;
      background: rgba(255,255,255,.1);
      margin: var(--space-2) var(--space-3);
    }

    .ui-sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 8px 10px;
      margin: 1px 6px;
      border-radius: 6px;
      color: rgba(255,255,255,.65);
      font-size: 12.5px;
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      position: relative;
      transition: background .12s, color .12s;
      background: transparent;
      border: none;
      width: calc(100% - 12px);
      text-align: left;
      min-height: var(--ds-touch-target);
    }
    .ui-sidebar__item:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }
    .ui-sidebar__item--active {
      background: rgba(255,255,255,.18);
      color: #fff;
      font-weight: 600;
    }
    .ui-sidebar__item--active::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 4px;
      bottom: 4px;
      width: 3px;
      background: #fff;
      border-radius: 0 2px 2px 0;
    }

    .ui-sidebar__icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .ui-sidebar__label {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ui-sidebar__badge {
      margin-left: auto;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 8px;
      color: #fff;
    }
    .ui-sidebar__badge--red   { background: var(--ds-danger); }
    .ui-sidebar__badge--green { background: var(--ds-success); }

    .ui-sidebar__chip {
      margin-left: auto;
      font-size: 8px;
      background: rgba(255,255,255,.15);
      color: rgba(255,255,255,.6);
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .ui-sidebar__chevron {
      margin-left: auto;
      font-size: 10px;
      color: rgba(255,255,255,.4);
      transition: transform .2s;
    }
    .ui-sidebar__item--expanded .ui-sidebar__chevron { transform: rotate(180deg); }

    .ui-sidebar__sub {
      overflow: hidden;
      max-height: 0;
      transition: max-height .25s ease;
    }
    .ui-sidebar__sub--open { max-height: 240px; }

    .ui-sidebar__subitem {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 6px 10px 6px 34px;
      margin: 1px 6px;
      border-radius: 6px;
      color: rgba(255,255,255,.55);
      font-size: 12px;
      text-decoration: none;
      cursor: pointer;
      transition: background .12s, color .12s;
      min-height: var(--ds-touch-target);
    }
    .ui-sidebar__subitem:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }
    .ui-sidebar__subitem--active {
      background: rgba(255,255,255,.15);
      color: #fff;
      font-weight: 600;
    }
    .ui-sidebar__subitem--active .ui-sidebar__dot { background: #fff; }
    .ui-sidebar__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,.4);
      flex-shrink: 0;
    }
  `],
})
export class SidebarComponent {
  readonly itemClick = output<void>();

  private readonly registry = inject(ModuleRegistry);
  private readonly router   = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly expandedSet = signal<Set<string>>(new Set());

  readonly visibleSections = computed<NavSection[]>(() =>
    NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.isItemVisible(item)),
      }))
      .filter(section => section.items.length > 0),
  );

  constructor() {
    const sync = () => {
      const url = this.url();
      for (const section of NAV_SECTIONS) {
        for (const item of section.items) {
          if (item.kind === 'expandable' && item.children.some(c => url.startsWith(c.path))) {
            const next = new Set(this.expandedSet());
            next.add(item.label);
            this.expandedSet.set(next);
          }
        }
      }
    };
    sync();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(sync);
  }

  protected isItemVisible(item: NavItem): boolean {
    if (item.kind === 'expandable') return true;
    return !item.moduleKey || this.registry.isActive(item.moduleKey);
  }

  protected isExpanded(label: string): boolean {
    return this.expandedSet().has(label);
  }

  protected toggleExpanded(label: string): void {
    const next = new Set(this.expandedSet());
    if (next.has(label)) next.delete(label);
    else next.add(label);
    this.expandedSet.set(next);
  }

  protected isGroupActive(item: NavItem): boolean {
    if (item.kind !== 'expandable') return false;
    const url = this.url();
    return item.children.some(c => url.startsWith(c.path));
  }
}
