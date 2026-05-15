import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { UiFieldComponent } from '@shared/ui/form/ui-field/ui-field.component';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { ProfileApiService } from '../../services/profile-api.service';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, UiFieldComponent],
  template: `
    <section class="settings-page">
      <header class="settings-page__header">
        <h1>Cambiar contraseña</h1>
      </header>

      <div class="settings-card">
        @if (success()) {
          <div class="settings-banner settings-banner--success" role="status">
            <i class="pi pi-check-circle"></i>
            <span>Contraseña actualizada correctamente.</span>
          </div>
        }
        @if (error()) {
          <div class="settings-banner settings-banner--error" role="alert">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ error() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="settings-form">
          <ui-field>
            <p-password
              formControlName="currentPassword"
              [feedback]="false"
              [toggleMask]="true"
              inputId="current-password"
              styleClass="w-full"
              inputStyleClass="w-full"
              autocomplete="current-password" />
            <label for="current-password">Contraseña actual</label>
          </ui-field>

          <ui-field>
            <p-password
              formControlName="newPassword"
              [toggleMask]="true"
              inputId="new-password"
              styleClass="w-full"
              inputStyleClass="w-full"
              autocomplete="new-password" />
            <label for="new-password">Nueva contraseña</label>
          </ui-field>

          <ui-field
            [error]="form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty
              ? 'Las contraseñas no coinciden.' : null">
            <p-password
              formControlName="confirmPassword"
              [feedback]="false"
              [toggleMask]="true"
              inputId="confirm-password"
              styleClass="w-full"
              inputStyleClass="w-full"
              autocomplete="new-password" />
            <label for="confirm-password">Confirmar nueva contraseña</label>
          </ui-field>

          <p-button
            type="submit"
            label="Actualizar contraseña"
            [loading]="loading()"
            [disabled]="form.invalid || loading()"
            styleClass="w-full" />
        </form>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .settings-page {
      max-width: 480px;
      margin: 0 auto;
      padding: var(--space-6) var(--space-4);
    }
    .settings-page__header {
      margin-bottom: var(--space-5);
    }
    .settings-page__header h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--ds-text);
      margin: 0;
    }

    .settings-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: var(--space-6);
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .settings-banner {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 10px 12px;
      margin-bottom: var(--space-4);
      border-radius: 8px;
      font-size: 13px;
    }
    .settings-banner .pi { font-size: 15px; }
    .settings-banner--success {
      background: color-mix(in srgb, var(--ds-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-success) 35%, transparent);
      color: #15803d;
    }
    .settings-banner--error {
      background: color-mix(in srgb, var(--ds-danger) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
      color: #b91c1c;
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
