import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Popover } from 'primeng/popover';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuComponent } from '@features/profile/components/profile-menu/profile-menu.component';

@Component({
  selector: 'ui-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Popover, ProfileMenuComponent],
  template: `
    <header class="ui-topbar">
      <button
        type="button"
        class="ui-topbar__hamburger"
        (click)="menuToggle.emit()"
        aria-label="Abrir menú">
        <i class="pi pi-bars"></i>
      </button>

      <div class="ui-topbar__brand">
        <img
          class="ui-topbar__logo"
          [src]="logoSrc()"
          [alt]="tenantName()"
          (error)="onLogoError()" />
        <span class="ui-topbar__tenant-name">{{ tenantName() }}</span>
        <span class="ui-topbar__tenant-badge">Admin</span>
      </div>

      <!-- TODO: implementar búsqueda global -->
      <div class="ui-topbar__search" role="search" aria-disabled="true">
        <i class="pi pi-search"></i>
        <span>Buscar pacientes, turnos, estudios…</span>
      </div>

      <div class="ui-topbar__actions">
        <!-- TODO: badge dinámico de notificaciones -->
        <button
          type="button"
          class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
          aria-label="Notificaciones">
          <i class="pi pi-bell"></i>
        </button>
        <button type="button" class="ui-topbar__icon-btn" aria-label="Ayuda">
          <i class="pi pi-question-circle"></i>
        </button>
        <button
          type="button"
          class="ui-topbar__avatar"
          aria-label="Menú de usuario"
          (click)="profilePopover.toggle($event)">
          {{ userInitials() }}
        </button>

        <p-popover #profilePopover styleClass="ui-profile-popover">
          <ui-profile-menu (close)="profilePopover.hide()" />
        </p-popover>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }

    .ui-topbar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: var(--ds-topbar-h);
      padding: 0 var(--space-4);
      background: var(--brand-shell-bg);
      color: #f1f5f9;
      box-shadow: 0 1px 3px rgba(0,0,0,.35);
    }

    .ui-topbar__hamburger {
      display: none;
      width: var(--ds-touch-target);
      height: var(--ds-touch-target);
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: rgba(255,255,255,.85);
      cursor: pointer;
      font-size: 18px;
    }
    .ui-topbar__hamburger:hover { color: #fff; }

    .ui-topbar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .ui-topbar__logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
      background: rgba(255,255,255,.08);
      color: var(--brand-primary);
      flex-shrink: 0;
      display: block;
    }
    .ui-topbar__tenant-name {
      color: #f1f5f9;
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ui-topbar__tenant-badge {
      font-size: 9px;
      background: var(--brand-primary);
      color: #fff;
      padding: 1px 6px;
      border-radius: 8px;
      letter-spacing: .04em;
    }

    .ui-topbar__search {
      flex: 1;
      max-width: 420px;
      margin: 0 var(--space-3);
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      padding: 7px 10px;
      color: rgba(255,255,255,.6);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: var(--space-1);
      cursor: text;
      user-select: none;
    }

    .ui-topbar__actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .ui-topbar__icon-btn {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255,255,255,.7);
      font-size: 14px;
      transition: background .15s, color .15s;
      position: relative;
    }
    .ui-topbar__icon-btn:hover {
      background: rgba(255,255,255,.16);
      color: #fff;
    }
    .ui-topbar__icon-btn--notif::after {
      content: '3';
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--ds-danger);
      color: #fff;
      font-size: 9px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .ui-topbar__avatar {
      width: 32px;
      height: 32px;
      background: var(--brand-primary);
      border: 2px solid transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: border-color .15s;
    }
    .ui-topbar__avatar:hover { border-color: rgba(255,255,255,.4); }

    @media (max-width: 767px) {
      .ui-topbar { padding: 0 var(--space-3); }
      .ui-topbar__hamburger { display: flex; }
      .ui-topbar__search    { display: none; }
      .ui-topbar__icon-btn,
      .ui-topbar__avatar {
        width: var(--ds-touch-target);
        height: var(--ds-touch-target);
      }
    }

    :host ::ng-deep .ui-profile-popover {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 30px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1) !important;
      border: 1px solid #e2e8f0 !important;
      overflow: hidden;
    }
    :host ::ng-deep .ui-profile-popover .p-popover-content {
      padding: 0 !important;
    }
  `],
})
export class TopbarComponent {
  readonly menuToggle = output<void>();

  private readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);
  private readonly userSession = inject(UserSessionService);
  private readonly tokens = inject(TokenService);

  protected readonly tenantName     = computed(() => this.tenantConfig()?.name ?? 'LabCore');
  protected readonly tenantInitials = computed(() => initials(this.tenantName()));

  private readonly defaultLogo = 'logo.svg';
  private readonly logoFallback = signal(false);
  protected readonly logoSrc = computed(() => {
    if (this.logoFallback()) return this.defaultLogo;
    const url = this.tenantConfig()?.logoUrl;
    return url && url.length > 0 ? url : this.defaultLogo;
  });
  protected onLogoError(): void { this.logoFallback.set(true); }

  protected readonly userInitials = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.firstName && u?.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    const sub = this.tokens.getPayload()?.sub ?? '';
    return sub.slice(0, 2).toUpperCase() || '?';
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
