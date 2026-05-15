import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-8 text-center">Nueva contraseña</h1>

        @if (tokenInvalid()) {
          <div class="flex flex-col items-center gap-4">
            <p-message severity="error" text="El link expiró o ya fue utilizado." styleClass="w-full" />
            <a routerLink="/forgot-password" class="text-sm text-[var(--brand-primary)] hover:underline">
              Solicitar nuevo link
            </a>
          </div>
        } @else if (success()) {
          <div class="flex flex-col items-center gap-4">
            <p-message severity="success" text="Contraseña actualizada. Ya podés ingresar con tu nueva contraseña." styleClass="w-full" />
            <a routerLink="/login" class="text-sm text-[var(--brand-primary)] hover:underline">Ir al login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <p-floatlabel>
              <p-password formControlName="newPassword" [toggleMask]="true" inputId="newPassword"
                styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="newPassword">Nueva contraseña</label>
            </p-floatlabel>

            <p-floatlabel>
              <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
                inputId="confirmPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="confirmPassword">Confirmar contraseña</label>
            </p-floatlabel>

            @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
              <p-message severity="error" text="Las contraseñas no coinciden." styleClass="w-full" />
            }

            @if (error()) { <p-message severity="error" [text]="error()!" styleClass="w-full" /> }

            <p-button type="submit" label="Guardar contraseña" [loading]="loading()"
              [disabled]="form.invalid || loading()" styleClass="w-full" />
          </form>
        }
      </div>
    </div>
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
