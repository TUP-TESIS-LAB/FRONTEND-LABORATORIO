import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '@shared/ui/auth-layout/auth-layout.component';
import { UiPasswordFieldComponent } from '@shared/ui/password-field/password-field.component';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, UiPasswordFieldComponent],
  template: `
    <ui-auth-layout>
      <h1 class="auth-card__title">Nueva contraseña</h1>

      @if (tokenInvalid()) {
        <div class="auth-error" role="alert">
          <i class="pi pi-exclamation-circle"></i>
          <span>El link expiró o ya fue utilizado.</span>
        </div>
        <p class="auth-helper">
          <a routerLink="/forgot-password">Solicitar nuevo link</a>
        </p>
      } @else if (success()) {
        <div class="auth-success" role="status">
          <i class="pi pi-check-circle"></i>
          <span>Contraseña actualizada. Ya podés ingresar con tu nueva contraseña.</span>
        </div>
        <p class="auth-helper">
          <a routerLink="/login">Ir al login</a>
        </p>
      } @else {
        <p class="auth-card__subtitle">
          Ingresá tu nueva contraseña. Mínimo 8 caracteres.
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <ui-password-field
            label="Nueva contraseña"
            inputId="reset-new-password"
            [control]="form.controls.newPassword" />

          <ui-password-field
            label="Confirmar contraseña"
            inputId="reset-confirm-password"
            [control]="form.controls.confirmPassword" />

          @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
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
export class ResetPasswordComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly tokenInvalid = signal(false);
  protected readonly success = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private resetToken = '';
  private tenantId = '';

  protected readonly form = new FormGroup({
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    this.resetToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? '';

    if (!this.resetToken || !this.tenantId) {
      this.tokenInvalid.set(true);
      return;
    }

    try {
      await this.authApi.validateResetToken(this.resetToken, this.tenantId);
    } catch {
      this.tokenInvalid.set(true);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.resetPassword(
        this.resetToken,
        this.form.getRawValue().newPassword,
        this.tenantId,
      );
      this.success.set(true);
    } catch {
      this.error.set('No se pudo actualizar la contraseña. El link puede haber expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
