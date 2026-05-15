import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { ProfileApiService } from '../../services/profile-api.service';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message],
  template: `
    <div class="max-w-sm mx-auto bg-white rounded-2xl shadow-md p-8 mt-8">
      <h2 class="text-xl font-semibold text-[var(--ds-text)] mb-6">Cambiar contraseña</h2>

      @if (success()) {
        <p-message severity="success" text="Contraseña actualizada correctamente." styleClass="w-full mb-4" />
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
        <p-floatlabel>
          <p-password formControlName="currentPassword" [feedback]="false" [toggleMask]="true"
            inputId="currentPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="current-password" />
          <label for="currentPassword">Contraseña actual</label>
        </p-floatlabel>

        <p-floatlabel>
          <p-password formControlName="newPassword" [toggleMask]="true" inputId="newPassword"
            styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
          <label for="newPassword">Nueva contraseña</label>
        </p-floatlabel>

        <p-floatlabel>
          <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
            inputId="confirmPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
          <label for="confirmPassword">Confirmar nueva contraseña</label>
        </p-floatlabel>

        @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
          <p-message severity="error" text="Las contraseñas no coinciden." styleClass="w-full" />
        }
        @if (error()) { <p-message severity="error" [text]="error()!" styleClass="w-full" /> }

        <p-button type="submit" label="Actualizar contraseña" [loading]="loading()"
          [disabled]="form.invalid || loading()" styleClass="w-full" />
      </form>
    </div>
  `,
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
