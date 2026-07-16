import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ProfileApiService } from '@features/profile/services/profile-api.service';

const LOGOUT_DELAY_MS = 2000;

@Component({
  selector: 'ui-change-password-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Drawer, Button, Password],
  template: `
    <p-drawer
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-cp-drawer"
      [modal]="true"
      [dismissible]="true">
      <ng-template #headless>
        <div class="ui-cp-drawer__header">
          <span>Cambiar contraseña</span>
          <button type="button" class="ui-cp-drawer__close" (click)="close()" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="ui-cp-drawer__body">
          @if (success()) {
            <div class="ui-alert ui-alert--success" role="status">
              <i class="pi pi-check-circle"></i>
              <span>Contraseña actualizada. Cerrando tu sesión para que ingreses con la nueva…</span>
            </div>
          }
          @if (error()) {
            <div class="ui-alert ui-alert--error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-cp-drawer__form">
            <div class="ui-field">
              <label for="cp-current">Contraseña actual</label>
              <p-password
                inputId="cp-current"
                formControlName="currentPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Tu contraseña actual"
                autocomplete="current-password" />
            </div>

            <div class="ui-field">
              <label for="cp-new">Nueva contraseña</label>
              <p-password
                inputId="cp-new"
                formControlName="newPassword"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password" />
              @if (form.get('newPassword')?.touched && form.get('newPassword')?.errors?.['minlength']) {
                <small class="ui-field__error">Mínimo 8 caracteres.</small>
              }
            </div>

            <div class="ui-field">
              <label for="cp-confirm">Confirmar nueva contraseña</label>
              <p-password
                inputId="cp-confirm"
                formControlName="confirmPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Repetí la nueva contraseña"
                autocomplete="new-password" />
              @if (form.get('confirmPassword')?.dirty && form.errors?.['mismatch']) {
                <small class="ui-field__error">Las contraseñas no coinciden.</small>
              }
            </div>

            <div class="ui-cp-drawer__actions">
              <p-button
                type="submit"
                label="Actualizar contraseña"
                severity="primary"
                [loading]="loading()"
                [disabled]="form.invalid || loading()" />
            </div>
          </form>
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
    :host { display: contents; }

    :host ::ng-deep .ui-cp-drawer {
      width: 100% !important;
      max-width: 420px;
    }
    @media (max-width: 480px) {
      :host ::ng-deep .ui-cp-drawer { max-width: 100%; }
    }

    .ui-cp-drawer__header {
      height: 52px;
      background: var(--brand-shell-bg);
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .ui-cp-drawer__close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s, color .15s;
    }
    .ui-cp-drawer__close:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }

    .ui-cp-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
    }

    .ui-cp-drawer__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .ui-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .ui-field label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      letter-spacing: .2px;
    }
    .ui-field__error {
      font-size: 12px;
      color: var(--ds-danger);
      padding-left: var(--space-1);
    }

    .ui-cp-drawer__actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--space-4);
      margin-top: var(--space-2);
      border-top: 1px solid #f1f5f9;
    }
    @media (max-width: 480px) {
      .ui-cp-drawer__actions { justify-content: stretch; }
      :host ::ng-deep .ui-cp-drawer__actions .p-button { width: 100%; }
    }

    .ui-alert {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 12px 14px;
      margin-bottom: var(--space-4);
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
    }
    .ui-alert .pi { font-size: 16px; flex-shrink: 0; }
    .ui-alert--success {
      background: color-mix(in srgb, var(--ds-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-success) 35%, transparent);
      color: #15803d;
    }
    .ui-alert--error {
      background: color-mix(in srgb, var(--ds-danger) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
      color: #b91c1c;
    }

    :host ::ng-deep .ui-cp-drawer__body p-password { display: block; }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password { width: 100%; display: block; }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password-input,
    :host ::ng-deep .ui-cp-drawer__body p-password input.p-inputtext {
      width: 100%;
      min-height: 44px;
      padding: 10px 40px 10px 14px;
      font-size: 14px;
      line-height: 1.4;
      background: #fff;
      color: var(--ds-text);
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      transition: border-color .15s, box-shadow .15s;
    }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password-input:focus,
    :host ::ng-deep .ui-cp-drawer__body p-password input.p-inputtext:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 18%, transparent);
    }
  `],
})
export class ChangePasswordDrawerComponent {
  private readonly profileMenu = inject(ProfileMenuService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly tokens = inject(TokenService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  protected readonly visible = this.profileMenu.passwordDrawerOpen;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
      newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
      confirmPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    },
    { validators: passwordsMatch },
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.form.reset();
        this.error.set(null);
        this.success.set(false);
      }
    });
  }

  protected close(): void {
    this.profileMenu.closePasswordDrawer();
  }

  protected onVisibleChange(open: boolean): void {
    if (!open) this.profileMenu.closePasswordDrawer();
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    const userId = this.tokens.getUserId();
    if (userId === null) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);
    try {
      const { currentPassword, newPassword } = this.form.getRawValue();
      await this.profileApi.changePassword(userId, currentPassword, newPassword);
      this.success.set(true);
      this.form.reset();
      setTimeout(() => {
        this.tokens.removeToken();
        this.userSession.clear();
        this.router.navigate(['/login']);
      }, LOGOUT_DELAY_MS);
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 401)) {
        this.error.set('La contraseña actual es incorrecta.');
      } else {
        this.error.set('Ocurrió un error. Intentá de nuevo más tarde.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
