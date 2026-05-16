import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '@shared/ui/auth-layout/auth-layout.component';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <ui-auth-layout>
      <h1 class="auth-card__title">Olvidé mi contraseña</h1>
      <p class="auth-card__subtitle">
        Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
      </p>

      @if (sent()) {
        <div class="auth-success" role="status">
          <i class="pi pi-check-circle"></i>
          <span>Si el email existe en el sistema, recibirás un link para restablecer tu contraseña.</span>
        </div>
        <p class="auth-helper">
          <a routerLink="/login">Volver al login</a>
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="auth-field">
            <label for="forgot-email">Correo electrónico</label>
            <input
              id="forgot-email"
              type="email"
              autocomplete="email"
              inputmode="email"
              formControlName="email"
              placeholder="usuario@laboratorio.com"
              class="auth-input" />
          </div>

          @if (error()) {
            <div class="auth-error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <button type="submit" class="auth-btn" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <i class="pi pi-spin pi-spinner"></i> Enviando…
            } @else {
              <i class="pi pi-send"></i> Enviar link
            }
          </button>

          <p class="auth-helper">
            <a routerLink="/login">Volver al login</a>
          </p>
        </form>
      }
    </ui-auth-layout>
  `,
})
export class ForgotPasswordComponent {
  private readonly authApi = inject(AuthApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', { validators: [Validators.required, Validators.email], nonNullable: true }),
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.internalForgotPassword(this.form.getRawValue().email);
      this.sent.set(true);
    } catch {
      this.error.set('Ocurrió un error. Intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }
}
