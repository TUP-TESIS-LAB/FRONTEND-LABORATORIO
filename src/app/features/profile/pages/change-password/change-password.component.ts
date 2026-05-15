import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { ProfileApiService } from '../../services/profile-api.service';

const LOGOUT_DELAY_MS = 2000;

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password],
  template: `
    <section class="ui-page">
      <div class="ui-page-header">
        <h1>Cambiar contraseña</h1>
        <p>Actualizá tu contraseña periódicamente para mantener tu cuenta segura.</p>
      </div>

      <div class="ui-card">
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

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-form-grid">
          <div class="ui-field">
            <label for="current-password">Contraseña actual</label>
            <p-password
              inputId="current-password"
              formControlName="currentPassword"
              [feedback]="false"
              [toggleMask]="true"
              [fluid]="true"
              placeholder="Tu contraseña actual"
              autocomplete="current-password" />
          </div>

          <div class="ui-field">
            <label for="new-password">Nueva contraseña</label>
            <p-password
              inputId="new-password"
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
            <label for="confirm-password">Confirmar nueva contraseña</label>
            <p-password
              inputId="confirm-password"
              formControlName="confirmPassword"
              [feedback]="false"
              [toggleMask]="true"
              [fluid]="true"
              placeholder="Repetí la nueva contraseña"
              autocomplete="new-password" />
            @if (form.get('confirmPassword')?.dirty && form.get('confirmPassword')?.errors?.['mismatch']) {
              <small class="ui-field__error">Las contraseñas no coinciden.</small>
            }
          </div>

          <div class="ui-form-actions">
            <p-button
              type="submit"
              label="Actualizar contraseña"
              severity="primary"
              [loading]="loading()"
              [disabled]="form.invalid || loading()" />
          </div>
        </form>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .ui-page {
      max-width: 560px;
      margin: 0 auto;
    }

    .ui-page-header { margin-bottom: var(--space-5); }
    .ui-page-header h1 {
      font-size: clamp(20px, 3vw, 24px);
      font-weight: 700;
      color: var(--ds-text);
      margin: 0 0 var(--space-1);
    }
    .ui-page-header p {
      font-size: 13px;
      color: var(--ds-text-muted);
      margin: 0;
    }

    .ui-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: var(--space-6);
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }

    .ui-form-grid {
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

    .ui-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-4);
      margin-top: var(--space-2);
      border-top: 1px solid #f1f5f9;
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

    /* PrimeNG v21 — forzar styling consistente del p-password en este componente.
       El wrapper interno + el input necesitan espacio explícito y bordes claros. */
    :host ::ng-deep p-password { display: block; }
    :host ::ng-deep p-password .p-password { width: 100%; display: block; }
    :host ::ng-deep p-password .p-password-input,
    :host ::ng-deep p-password input.p-inputtext {
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
    :host ::ng-deep p-password .p-password-input:focus,
    :host ::ng-deep p-password input.p-inputtext:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 18%, transparent);
    }
    :host ::ng-deep p-password .p-password-toggle-mask-icon,
    :host ::ng-deep p-password .p-password-mask-icon,
    :host ::ng-deep p-password .p-password-unmask-icon {
      color: #94a3b8;
    }

    @media (max-width: 480px) {
      .ui-card { padding: var(--space-4); border-radius: 8px; }
      .ui-form-actions { justify-content: stretch; }
      .ui-form-actions p-button,
      :host ::ng-deep .ui-form-actions .p-button { width: 100%; }
    }
  `],
})
export class ChangePasswordComponent {
  private readonly profileApi = inject(ProfileApiService);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly form = new FormGroup({
    currentPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

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
      // Force re-authentication with the new password. The old JWT remains
      // technically valid until it expires (backend doesn't invalidate it),
      // so we clear it client-side and bounce to /login after a brief pause
      // that lets the user read the confirmation.
      setTimeout(() => {
        this.tokens.removeToken();
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
