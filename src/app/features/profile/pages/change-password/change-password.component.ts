import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { ProfileApiService } from '../../services/profile-api.service';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message],
  template: `
    <section class="ui-page">
      <div class="ui-page-header">
        <h1>Cambiar contraseña</h1>
        <p>Actualizá tu contraseña periódicamente para mantener tu cuenta segura.</p>
      </div>

      <div class="ui-card">
        @if (success()) {
          <p-message
            severity="success"
            text="Contraseña actualizada correctamente."
            styleClass="ui-banner" />
        }
        @if (error()) {
          <p-message
            severity="error"
            [text]="error()!"
            styleClass="ui-banner" />
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-form-grid">
          <div class="ui-field">
            <p-floatlabel variant="on">
              <p-password
                inputId="current-password"
                formControlName="currentPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                autocomplete="current-password" />
              <label for="current-password">Contraseña actual</label>
            </p-floatlabel>
          </div>

          <div class="ui-field">
            <p-floatlabel variant="on">
              <p-password
                inputId="new-password"
                formControlName="newPassword"
                [toggleMask]="true"
                [fluid]="true"
                autocomplete="new-password" />
              <label for="new-password">Nueva contraseña</label>
            </p-floatlabel>
            @if (form.get('newPassword')?.touched && form.get('newPassword')?.errors?.['minlength']) {
              <small class="p-error">Mínimo 8 caracteres.</small>
            }
          </div>

          <div class="ui-field">
            <p-floatlabel variant="on">
              <p-password
                inputId="confirm-password"
                formControlName="confirmPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                autocomplete="new-password" />
              <label for="confirm-password">Confirmar nueva contraseña</label>
            </p-floatlabel>
            @if (form.get('confirmPassword')?.dirty && form.get('confirmPassword')?.errors?.['mismatch']) {
              <small class="p-error">Las contraseñas no coinciden.</small>
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

    .ui-page-header {
      margin-bottom: var(--space-5);
    }
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
      gap: var(--space-1);
    }
    .ui-field .p-error {
      font-size: 12px;
      color: var(--ds-danger);
      padding-left: var(--space-1);
    }

    .ui-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding-top: var(--space-2);
      margin-top: var(--space-2);
      border-top: 1px solid #f1f5f9;
    }

    :host ::ng-deep .ui-banner {
      display: block;
      margin-bottom: var(--space-4);
    }

    /* PrimeNG Password en v21 — asegurar que el wrapper interno expanda al 100% */
    :host ::ng-deep p-password {
      display: block;
    }
    :host ::ng-deep p-password .p-password,
    :host ::ng-deep p-password .p-inputtext {
      width: 100%;
    }

    @media (max-width: 480px) {
      .ui-card { padding: var(--space-4); border-radius: 8px; }
      .ui-form-actions p-button { width: 100%; }
    }
  `],
})
export class ChangePasswordComponent {
  private readonly profileApi = inject(ProfileApiService);
  private readonly tokens = inject(TokenService);

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
