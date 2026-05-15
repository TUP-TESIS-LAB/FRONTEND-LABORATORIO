import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, InputText, FloatLabel, Message, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-2 text-center">Olvidé mi contraseña</h1>
        <p class="text-sm text-[var(--ds-text-muted)] text-center mb-8">
          Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
        </p>

        @if (sent()) {
          <p-message
            severity="success"
            text="Si el email existe en el sistema, recibirás un link para restablecer tu contraseña."
            styleClass="w-full mb-6"
          />
          <a routerLink="/login" class="block text-center text-sm text-[var(--brand-primary)] hover:underline">
            Volver al login
          </a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <p-floatlabel>
              <input
                pInputText
                id="email"
                formControlName="email"
                inputmode="email"
                autocomplete="email"
                class="w-full"
              />
              <label for="email">Email</label>
            </p-floatlabel>

            @if (error()) {
              <p-message severity="error" [text]="error()!" styleClass="w-full" />
            }

            <p-button
              type="submit"
              label="Enviar link"
              [loading]="loading()"
              [disabled]="form.invalid || loading()"
              styleClass="w-full"
            />

            <a routerLink="/login" class="text-center text-sm text-[var(--brand-primary)] hover:underline">
              Volver al login
            </a>
          </form>
        }
      </div>
    </div>
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
