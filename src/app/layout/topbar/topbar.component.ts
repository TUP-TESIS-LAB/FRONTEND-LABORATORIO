import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Popover } from 'primeng/popover';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { AsistenteAyudaService } from '@core/services/asistente-ayuda.service';
import { TokenService } from '@core/auth/token.service';
import { NavAccessService, NavSearchEntry } from '@core/nav/nav-access.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuComponent } from '@features/profile/components/profile-menu/profile-menu.component';
import { NotificationBellComponent } from '@features/notifications/components/notification-bell/notification-bell.component';
import { BranchBadgeComponent } from './branch-badge.component';
import { BreadcrumbComponent } from '@shared/ui/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'ui-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Popover,
    AutoCompleteModule,
    ProfileMenuComponent,
    BranchBadgeComponent,
    BreadcrumbComponent,
    NotificationBellComponent,
  ],
  template: `
    <header class="ui-topbar">
      <button
        type="button"
        class="ui-topbar__hamburger"
        (click)="menuToggle.emit()"
        aria-label="Colapsar menú">
        <i class="pi pi-bars"></i>
      </button>

      <ui-breadcrumb class="ui-topbar__breadcrumb" />

      <div class="ui-topbar__search" role="search">
        <p-autocomplete
          [suggestions]="suggestions()"
          (completeMethod)="onComplete($event)"
          (onSelect)="onSelect($event)"
          optionLabel="label"
          placeholder="Buscar una sección…"
          appendTo="body">
          <ng-template let-e pTemplate="item">
            <div class="ui-topbar__search-item">
              <i [class]="e.icon"></i>
              <div class="ui-topbar__search-item-text">
                <span class="ui-topbar__search-item-label">{{ e.label }}</span>
                <span class="ui-topbar__search-item-section">{{ e.sectionLabel }}</span>
              </div>
            </div>
          </ng-template>
        </p-autocomplete>
      </div>

      <div class="ui-topbar__actions">
        <ui-branch-badge />
        <notif-bell />
        <button
          type="button"
          class="ui-topbar__icon-btn"
          [class.ui-topbar__icon-btn--active]="assistant.open()"
          aria-label="Asistente de ayuda"
          [attr.aria-pressed]="assistant.open()"
          (click)="assistant.toggle()">
          <i class="pi pi-comments"></i>
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
      background: #fff;
      color: #1e293b;
      border-bottom: 1px solid rgba(15,23,42,.08);
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }

    .ui-topbar__hamburger {
      display: flex;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: rgba(30,41,59,.7);
      cursor: pointer;
      font-size: 18px;
      flex-shrink: 0;
    }
    .ui-topbar__hamburger:hover { color: #1e293b; background: rgba(15,23,42,.06); }

    .ui-topbar__breadcrumb {
      min-width: 0;
      display: flex;
      align-items: center;
    }

    .ui-topbar__search {
      flex: 1;
      max-width: 420px;
      margin: 0 var(--space-3);
    }
    .ui-topbar__search ::ng-deep .p-autocomplete { width: 100%; display: block; }
    .ui-topbar__search ::ng-deep .p-autocomplete-input {
      width: 100%;
      background: rgba(15,23,42,.04);
      border: 1px solid rgba(15,23,42,.1);
      font-size: 12px;
      padding: 7px 10px;
    }
    .ui-topbar__search-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 2px 0;
    }
    .ui-topbar__search-item i { color: rgba(30,41,59,.5); font-size: 13px; width: 16px; text-align: center; }
    .ui-topbar__search-item-text { display: flex; flex-direction: column; gap: 1px; }
    .ui-topbar__search-item-label { font-size: 13px; color: #1e293b; }
    .ui-topbar__search-item-section { font-size: 10px; color: rgba(30,41,59,.5); }

    .ui-topbar__actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .ui-topbar__icon-btn {
      width: 32px;
      height: 32px;
      background: rgba(15,23,42,.04);
      border: 1px solid rgba(15,23,42,.1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(30,41,59,.65);
      font-size: 14px;
      transition: background .15s, color .15s;
      position: relative;
    }
    .ui-topbar__icon-btn:hover {
      background: rgba(15,23,42,.08);
      color: #1e293b;
    }
    .ui-topbar__icon-btn--active,
    .ui-topbar__icon-btn--active:hover {
      background: var(--brand-primary);
      border-color: var(--brand-primary);
      color: #fff;
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
    .ui-topbar__avatar:hover { border-color: rgba(15,23,42,.2); }

    @media (max-width: 767px) {
      .ui-topbar { padding: 0 var(--space-3); }
      .ui-topbar__hamburger { width: var(--ds-touch-target); height: var(--ds-touch-target); }
      .ui-topbar__search    { display: none; }
      /* En mobile no entra el chip de sucursal junto a los iconos: se oculta
         (el texto largo envolvía y aplastaba campana/chat/avatar). */
      ui-branch-badge { display: none; }
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

  private readonly userSession = inject(UserSessionService);
  private readonly tokens = inject(TokenService);
  private readonly navAccess = inject(NavAccessService);
  private readonly router = inject(Router);
  protected readonly assistant = inject(AsistenteAyudaService);

  protected readonly userInitials = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.firstName && u?.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    const sub = this.tokens.getPayload()?.sub ?? '';
    return sub.slice(0, 2).toUpperCase() || '?';
  });

  protected readonly suggestions = signal<NavSearchEntry[]>([]);

  /** Filtra localmente sobre las rutas ya permitidas (módulo + sección + rol) — no hay backend acá. */
  protected onComplete(e: AutoCompleteCompleteEvent): void {
    const q = e.query?.trim().toLowerCase();
    if (!q) { this.suggestions.set([]); return; }
    this.suggestions.set(
      this.navAccess.searchableEntries().filter((entry) => entry.label.toLowerCase().includes(q)),
    );
  }

  protected onSelect(e: AutoCompleteSelectEvent): void {
    const entry = e.value as NavSearchEntry;
    if (entry.external) {
      window.open(entry.path, '_blank', 'noopener');
    } else {
      this.router.navigateByUrl(entry.path);
    }
  }
}
