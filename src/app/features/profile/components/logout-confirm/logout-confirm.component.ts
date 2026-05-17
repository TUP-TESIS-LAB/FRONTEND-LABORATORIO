import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';

@Component({
  selector: 'ui-logout-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      styleClass="ui-logout-dialog"
      [style]="{ width: '360px' }">
      <div class="ui-logout">
        <div class="ui-logout__icon"><i class="pi pi-sign-out"></i></div>
        <h3 class="ui-logout__title">¿Cerrar sesión?</h3>
        <p class="ui-logout__text">
          Tu sesión actual se cerrará y tendrás que volver a ingresar tu contraseña.
        </p>
        <div class="ui-logout__actions">
          <p-button
            label="Cancelar"
            severity="secondary"
            (onClick)="cancel()" />
          <p-button
            label="Cerrar sesión"
            severity="danger"
            (onClick)="confirm()" />
        </div>
      </div>
    </p-dialog>
  `,
  styles: [`
    :host { display: contents; }

    .ui-logout {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-4) var(--space-2) 0;
    }
    .ui-logout__icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fef2f2;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-3);
    }
    .ui-logout__icon .pi {
      font-size: 22px;
      color: #dc2626;
    }
    .ui-logout__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--ds-text);
      margin: 0 0 var(--space-2);
    }
    .ui-logout__text {
      font-size: 12px;
      color: var(--ds-text-muted);
      line-height: 1.5;
      margin: 0 0 var(--space-5);
    }
    .ui-logout__actions {
      display: flex;
      gap: var(--space-2);
      justify-content: center;
      width: 100%;
    }
  `],
})
export class LogoutConfirmComponent {
  private readonly profileMenu = inject(ProfileMenuService);
  private readonly tokens = inject(TokenService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  protected readonly visible = this.profileMenu.logoutConfirmOpen;

  protected onVisibleChange(open: boolean): void {
    if (!open) this.profileMenu.closeLogoutConfirm();
  }

  protected cancel(): void {
    this.profileMenu.closeLogoutConfirm();
  }

  protected async confirm(): Promise<void> {
    this.tokens.removeToken();
    this.userSession.clear();
    this.profileMenu.closeLogoutConfirm();
    await this.router.navigate(['/login']);
  }
}
