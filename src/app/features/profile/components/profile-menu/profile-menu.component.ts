import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { TokenService } from '@core/auth/token.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';

@Component({
  selector: 'ui-profile-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-pm">
      <div class="ui-pm__header">
        <div class="ui-pm__avatar">{{ initials() }}</div>
        <div class="ui-pm__identity">
          <div class="ui-pm__name">{{ fullName() }}</div>
          @if (primaryRole()) {
            <div class="ui-pm__role">{{ primaryRole() }}</div>
          }
          @if (email()) {
            <div class="ui-pm__email">{{ email() }}</div>
          }
        </div>
      </div>

      @if (tenantName()) {
        <div class="ui-pm__tenant">
          <i class="pi pi-building"></i>
          <span>{{ tenantName() }}</span>
          @if (primaryRole()) {
            <span class="ui-pm__badge">{{ primaryRole() }}</span>
          }
        </div>
      }

      <div class="ui-pm__divider"></div>

      <button type="button" class="ui-pm__item" disabled>
        <i class="pi pi-user"></i>
        <span>Mi perfil</span>
        <span class="ui-pm__coming">Próximamente</span>
      </button>

      <button type="button" class="ui-pm__item" (click)="onChangePasswordClick()">
        <i class="pi pi-lock"></i>
        <span>Cambiar contraseña</span>
      </button>

      <button type="button" class="ui-pm__item" disabled>
        <i class="pi pi-cog"></i>
        <span>Configuración de empresa</span>
        <span class="ui-pm__coming">Próximamente</span>
      </button>

      <div class="ui-pm__divider"></div>

      <div class="ui-pm__section-label">Cambiar sucursal</div>
      <button type="button" class="ui-pm__item ui-pm__item--branch" disabled>
        <i class="pi pi-map-marker"></i>
        <span>{{ tenantName() || 'Sucursal principal' }}</span>
        <i class="pi pi-check ui-pm__check"></i>
      </button>
      <div class="ui-pm__hint">Más sucursales próximamente</div>

      <div class="ui-pm__divider"></div>

      <button type="button" class="ui-pm__item ui-pm__item--danger" (click)="onLogoutClick()">
        <i class="pi pi-sign-out"></i>
        <span>Cerrar sesión</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ui-pm {
      width: 280px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      font-family: inherit;
    }

    .ui-pm__header {
      padding: 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ui-pm__avatar {
      width: 40px;
      height: 40px;
      background: var(--brand-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .ui-pm__identity { min-width: 0; }
    .ui-pm__name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ds-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ui-pm__role {
      font-size: 10px;
      font-weight: 600;
      color: var(--brand-primary);
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-top: 1px;
    }
    .ui-pm__email {
      font-size: 10px;
      color: var(--ds-text-muted);
      margin-top: 1px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ui-pm__tenant {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      font-size: 11px;
      color: #475569;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    }
    .ui-pm__tenant .pi { color: #64748b; font-size: 12px; }
    .ui-pm__badge {
      margin-left: auto;
      font-size: 9px;
      background: var(--brand-primary);
      color: #fff;
      padding: 1px 6px;
      border-radius: 8px;
      letter-spacing: .04em;
    }

    .ui-pm__divider { height: 1px; background: #f1f5f9; margin: 3px 0; }

    .ui-pm__section-label {
      padding: 4px 14px 2px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: #94a3b8;
    }

    .ui-pm__item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 14px;
      font-size: 12px;
      color: #374151;
      width: 100%;
      background: transparent;
      border: 0;
      cursor: pointer;
      transition: background .12s, color .12s;
      text-align: left;
      font-family: inherit;
    }
    .ui-pm__item .pi { font-size: 13px; color: #64748b; width: 16px; text-align: center; }
    .ui-pm__item:hover:not(:disabled) { background: #f8fafc; color: var(--ds-text); }
    .ui-pm__item:hover:not(:disabled) .pi { color: var(--brand-primary); }
    .ui-pm__item:disabled { opacity: .55; cursor: default; }

    .ui-pm__coming {
      margin-left: auto;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .ui-pm__item--branch .ui-pm__check { margin-left: auto; color: #10b981; }

    .ui-pm__hint {
      padding: 2px 14px 8px;
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }

    .ui-pm__item--danger { color: #dc2626; }
    .ui-pm__item--danger .pi { color: #dc2626; }
    .ui-pm__item--danger:hover:not(:disabled) {
      background: #fef2f2;
      color: #dc2626;
    }
    .ui-pm__item--danger:hover:not(:disabled) .pi { color: #dc2626; }
  `],
})
export class ProfileMenuComponent {
  readonly close = output<void>();

  private readonly userSession = inject(UserSessionService);
  private readonly tokens = inject(TokenService);
  private readonly tenantCfg = inject(Store).selectSignal(selectTenantConfig);
  private readonly profileMenu = inject(ProfileMenuService);

  protected readonly initials = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.firstName && u?.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    const sub = this.tokens.getPayload()?.sub ?? '';
    return sub.slice(0, 2).toUpperCase() || '?';
  });

  protected readonly fullName = computed(() => {
    const u = this.userSession.currentUser();
    if (u) return `${u.firstName} ${u.lastName}`.trim();
    return this.tokens.getPayload()?.sub ?? '';
  });

  protected readonly email = computed(() => this.userSession.currentUser()?.email ?? null);

  protected readonly primaryRole = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.roles?.length) return u.roles[0].description;
    return this.tokens.getRoles()[0] ?? '';
  });

  protected readonly tenantName = computed(() => this.tenantCfg()?.name ?? '');

  protected onChangePasswordClick(): void {
    this.profileMenu.openPasswordDrawer();
    this.close.emit();
  }

  protected onLogoutClick(): void {
    this.profileMenu.openLogoutConfirm();
    this.close.emit();
  }
}
