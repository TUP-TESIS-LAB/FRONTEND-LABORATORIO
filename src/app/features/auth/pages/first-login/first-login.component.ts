import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from '@shared/ui/auth-layout/auth-layout.component';
import { UiPasswordFieldComponent } from '@shared/ui/password-field/password-field.component';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-first-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AuthLayoutComponent, UiPasswordFieldComponent],
  template: `
    <ui-auth-layout>
      <h1 class="auth-card__title">Primer acceso</h1>
      <p class="auth-card__subtitle">
        Configurá tu contraseña para continuar. Mínimo 8 caracteres.
      </p>

      @if (!token()) {
        <div class="auth-error" role="alert">
          <i class="pi pi-exclamation-circle"></i>
          <span>El link de primer acceso no es válido. Solicitá uno nuevo al administrador.</span>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <ui-password-field
            label="Nueva contraseña"
            inputId="first-login-new-password"
            [control]="form.controls.newPassword" />

          <ui-password-field
            label="Confirmar contraseña"
            inputId="first-login-confirm-password"
            [control]="form.controls.confirmPassword" />

          @if (form.get('confirmPassword')?.dirty && form.errors?.['mismatch']) {
            <div class="auth-error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>Las contraseñas no coinciden.</span>
            </div>
          }
          @if (error()) {
            <div class="auth-error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <button type="submit" class="auth-btn" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <i class="pi pi-spin pi-spinner"></i> Guardando…
            } @else {
              <i class="pi pi-save"></i> Guardar contraseña
            }
          </button>
        </form>
      }
    </ui-auth-layout>
  `,
})
export class FirstLoginComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup(
    {
      newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
      confirmPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    const state = window.history.state as { firstLoginToken?: string } | null;
    this.token.set(state?.firstLoginToken ?? null);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading() || !this.token()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.setFirstLoginPassword(this.token()!, this.form.getRawValue().newPassword);
      await this.router.navigate(['/login']);
    } catch {
      this.error.set('No se pudo guardar la contraseña. El link puede haber expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
