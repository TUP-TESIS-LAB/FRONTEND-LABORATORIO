import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Store } from '@ngrx/store';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadBranchTotemConfig } from '@features/turnos/store/branch-totem-config/branch-totem-config.actions';
import {
  selectBranchTotemEnabled,
  selectAtencionDisplayEnabled,
  selectExtraccionDisplayEnabled,
} from '@features/turnos/store/branch-totem-config/branch-totem-config.selectors';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { AccessRegistry } from '@core/access/access-registry';
import { NAV_SECTIONS, NavItem, NavSection } from './sidebar.nav';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, TooltipModule],
  template: `
    <nav class="ui-sidebar" [class.ui-sidebar--collapsed]="collapsed()" aria-label="Navegación principal">
      <div class="ui-sidebar__brand">
        <img
          class="ui-sidebar__logo"
          [src]="logoSrc()"
          [alt]="tenantName()"
          (error)="onLogoError()" />
        @if (!collapsed()) {
          <span class="ui-sidebar__brand-name">{{ tenantName() }}</span>
        }
      </div>

      @for (section of visibleSections(); track section.label; let last = $last) {
        <div class="ui-sidebar__section">
          @if (!collapsed()) {
            <div class="ui-sidebar__section-label">{{ section.label }}</div>
          }
          @for (item of section.items; track item.label) {
            @if (item.kind === 'link') {
              <a
                [routerLink]="item.path"
                routerLinkActive="ui-sidebar__item--active"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="ui-sidebar__item"
                [pTooltip]="collapsed() ? item.label : ''"
                tooltipPosition="right"
                (click)="itemClick.emit()">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                @if (!collapsed()) {
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
                }
              </a>
            } @else if (item.kind === 'external') {
              <a
                [href]="item.href"
                target="_blank"
                rel="noopener"
                class="ui-sidebar__item"
                [pTooltip]="collapsed() ? item.label : ''"
                tooltipPosition="right"
                (click)="itemClick.emit()">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                @if (!collapsed()) {
                  <span class="ui-sidebar__label">{{ item.label }}</span>
                  @if (item.chip) {
                    <span class="ui-sidebar__chip">{{ item.chip }}</span>
                  }
                  <i class="pi pi-external-link ui-sidebar__chevron"></i>
                }
              </a>
            } @else {
              <button
                type="button"
                class="ui-sidebar__item ui-sidebar__item--expandable"
                [class.ui-sidebar__item--active]="isGroupActive(item)"
                [class.ui-sidebar__item--expanded]="isExpanded(item.label)"
                [pTooltip]="collapsed() ? item.label : ''"
                tooltipPosition="right"
                (click)="toggleExpanded(item.label)">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                @if (!collapsed()) {
                  <span class="ui-sidebar__label">{{ item.label }}</span>
                  <i class="pi pi-chevron-down ui-sidebar__chevron"></i>
                }
              </button>
              @if (!collapsed()) {
                <div class="ui-sidebar__sub" [class.ui-sidebar__sub--open]="isExpanded(item.label)">
                  @for (child of item.children; track child.path) {
                    @if (child.external) {
                      <a
                        [href]="child.path"
                        target="_blank"
                        rel="noopener"
                        class="ui-sidebar__subitem"
                        (click)="itemClick.emit()">
                        @if (child.icon) {
                          <span class="ui-sidebar__icon"><i [class]="child.icon"></i></span>
                        } @else {
                          <span class="ui-sidebar__dot"></span>
                        }
                        <span class="ui-sidebar__label">{{ child.label }}</span>
                        <i class="pi pi-external-link ui-sidebar__chevron"></i>
                      </a>
                    } @else {
                      <a
                        [routerLink]="child.path"
                        routerLinkActive="ui-sidebar__subitem--active"
                        class="ui-sidebar__subitem"
                        (click)="itemClick.emit()">
                        @if (child.icon) {
                          <span class="ui-sidebar__icon"><i [class]="child.icon"></i></span>
                        } @else {
                          <span class="ui-sidebar__dot"></span>
                        }
                        <span class="ui-sidebar__label">{{ child.label }}</span>
                      </a>
                    }
                  }
                </div>
              }
            }
          }
        </div>
        @if (!last) {
          <div class="ui-sidebar__divider"></div>
        }
      }

      @if (tvSalaUrl() || tvExtraccionUrl() || totemUrl()) {
        <div class="ui-sidebar__divider"></div>
        <div class="ui-sidebar__section">
          @if (!collapsed()) {
            <div class="ui-sidebar__section-label">Pantallas en sala</div>
          }
          @if (tvSalaUrl(); as url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener"
              class="ui-sidebar__item"
              [pTooltip]="collapsed() ? 'TV sala de espera' : ''"
              tooltipPosition="right"
              (click)="itemClick.emit()">
              <span class="ui-sidebar__icon"><i class="pi pi-desktop"></i></span>
              @if (!collapsed()) {
                <span class="ui-sidebar__label">TV sala de espera</span>
                <i class="pi pi-external-link ui-sidebar__chevron"></i>
              }
            </a>
          }
          @if (tvExtraccionUrl(); as url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener"
              class="ui-sidebar__item"
              [pTooltip]="collapsed() ? 'TV extracción' : ''"
              tooltipPosition="right"
              (click)="itemClick.emit()">
              <span class="ui-sidebar__icon"><i class="pi pi-desktop"></i></span>
              @if (!collapsed()) {
                <span class="ui-sidebar__label">TV extracción</span>
                <i class="pi pi-external-link ui-sidebar__chevron"></i>
              }
            </a>
          }
          @if (totemUrl(); as url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener"
              class="ui-sidebar__item"
              [pTooltip]="collapsed() ? 'Tótem' : ''"
              tooltipPosition="right"
              (click)="itemClick.emit()">
              <span class="ui-sidebar__icon"><i class="pi pi-mobile"></i></span>
              @if (!collapsed()) {
                <span class="ui-sidebar__label">Tótem</span>
                <i class="pi pi-external-link ui-sidebar__chevron"></i>
              }
            </a>
          }
        </div>
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

    .ui-sidebar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3) var(--space-3);
      min-width: 0;
    }
    .ui-sidebar__logo {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      object-fit: contain;
      background: rgba(255,255,255,.08);
      flex-shrink: 0;
      display: block;
    }
    .ui-sidebar__brand-name {
      color: #f1f5f9;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

    /* ---- Modo colapsado: solo iconos ---- */
    .ui-sidebar--collapsed .ui-sidebar__brand {
      justify-content: center;
      padding: var(--space-2) 0 var(--space-3);
    }
    .ui-sidebar--collapsed .ui-sidebar__item {
      justify-content: center;
      gap: 0;
      padding: 8px 0;
    }
    .ui-sidebar--collapsed .ui-sidebar__section-label { display: none; }
  `],
})
export class SidebarComponent implements OnInit {
  readonly collapsed = input<boolean>(false);
  readonly itemClick = output<void>();

  private readonly registry = inject(ModuleRegistry);
  private readonly router   = inject(Router);
  private readonly store    = inject(Store);
  private readonly session  = inject(UserSessionService);
  private readonly token    = inject(TokenService);
  private readonly access   = inject(AccessRegistry);

  private readonly tenantConfig = this.store.selectSignal(selectTenantConfig);
  protected readonly tenantName = computed(() => this.tenantConfig()?.name ?? 'LabCore');

  private readonly defaultLogo = 'logo.svg';
  private readonly logoFallback = signal(false);
  protected readonly logoSrc = computed(() => {
    if (this.logoFallback()) return this.defaultLogo;
    const url = this.tenantConfig()?.logoUrl;
    return url && url.length > 0 ? url : this.defaultLogo;
  });
  protected onLogoError(): void { this.logoFallback.set(true); }

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
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => this.applyChildVisibility(item))
          .filter((item) => this.isItemVisible(item)),
      }))
      .filter((section) => section.items.length > 0),
  );

  // ---- Pantallas (TV) + tótem: links condicionales en el footer ----
  // Cada link es visible solo si su flag está ON en la config de la sucursal del
  // usuario y conocemos el `tenantSlug` (necesario para armar la URL pública
  // `/display/:slug/:branchId`). El backend expone `tenantSlug` en `UserResponse`.
  private readonly totemEnabled = this.store.selectSignal(selectBranchTotemEnabled);
  private readonly atencionDisplay = this.store.selectSignal(selectAtencionDisplayEnabled);
  private readonly extraccionDisplay = this.store.selectSignal(selectExtraccionDisplayEnabled);

  private readonly branchId = computed<number | null>(
    () => this.session.currentUser()?.branch ?? null,
  );

  private readonly tenantSlug = computed<string | null>(
    () => this.session.currentUser()?.tenantSlug ?? null,
  );

  /** TV de sala de espera (atención). Visible si `atencionDisplayEnabled`. */
  readonly tvSalaUrl = computed<string | null>(() => {
    if (!this.atencionDisplay()) return null;
    const slug = this.tenantSlug();
    const id = this.branchId();
    return slug && id ? `/display/${slug}/${id}` : null;
  });

  /** TV de extracción. Visible si `extraccionDisplayEnabled`. */
  readonly tvExtraccionUrl = computed<string | null>(() => {
    if (!this.extraccionDisplay()) return null;
    const slug = this.tenantSlug();
    const id = this.branchId();
    return slug && id ? `/display/extraccion/${slug}/${id}` : null;
  });

  /** Tótem walk-in. Visible si el tótem está habilitado (`enabled`). */
  readonly totemUrl = computed<string | null>(() => {
    if (!this.totemEnabled()) return null;
    const slug = this.tenantSlug();
    const id = this.branchId();
    return slug && id ? '/turnos/totem' : null;
  });

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

  ngOnInit(): void {
    const id = this.branchId();
    if (id != null) this.store.dispatch(loadBranchTotemConfig({ branchId: id }));
  }

  /** Para expandables: filtra hijos por sectionKey + roleKey. Para links: devuelve el item igual. */
  private applyChildVisibility(item: NavItem): NavItem {
    if (item.kind !== 'expandable') return item;
    return {
      ...item,
      children: item.children.filter((c) =>
        (!c.sectionKey || this.access.has(c.sectionKey)) &&
        (!c.roleKey || this.token.getRoles().includes(c.roleKey)),
      ),
    };
  }

  protected isItemVisible(item: NavItem): boolean {
    if (item.kind === 'expandable') {
      // El grupo entero se gatea por módulo/sección; luego debe quedar al menos un hijo visible.
      if (item.moduleKey && !this.registry.isActive(item.moduleKey)) return false;
      if (item.sectionKey && !this.access.has(item.sectionKey)) return false;
      return item.children.length > 0;
    }
    if (item.kind === 'external') return true;
    if (item.moduleKey && !this.registry.isActive(item.moduleKey)) return false;
    if (item.roleKey && !this.token.getRoles().includes(item.roleKey)) return false;
    if (item.sectionKey && !this.access.has(item.sectionKey)) return false;
    return true;
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
