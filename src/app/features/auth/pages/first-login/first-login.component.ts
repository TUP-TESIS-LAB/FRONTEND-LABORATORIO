import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-first-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-2 text-center">Primer acceso</h1>
        <p class="text-sm text-[var(--ds-text-muted)] text-center mb-8">
          Configurá tu contraseña para continuar.
        </p>

        @if (!token()) {
          <p-message severity="error"
            text="El link de primer acceso no es válido. Solicitá uno nuevo al administrador."
            styleClass="w-full" />
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
export class FirstLoginComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

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
