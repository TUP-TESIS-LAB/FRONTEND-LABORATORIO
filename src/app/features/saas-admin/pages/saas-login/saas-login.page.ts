import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { AuthApiService } from '@features/auth/services/auth-api.service';
import { TokenService } from '@core/auth/token.service';

@Component({
  selector: 'saas-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  providers: [MessageService],
  template: `
    <div class="saas-login">
      <form [formGroup]="form" (ngSubmit)="submit()" class="saas-login__card">
        <div class="saas-login__brand">
          <img src="logo.svg" alt="" />
          <h1>Platform Admin</h1>
          <p>Acceso para administradores de plataforma</p>
        </div>

        @if (errorMessage(); as msg) {
          <div class="saas-login__error" role="alert">{{ msg }}</div>
        }

        <label class="saas-login__field">
          <span>Email</span>
          <input pInputText type="email" formControlName="email" autocomplete="username" />
        </label>

        <label class="saas-login__field">
          <span>Contraseña</span>
          <p-password formControlName="password" [feedback]="false" [toggleMask]="true" inputStyleClass="w-full" />
        </label>

        <p-button type="submit" label="Ingresar" [loading]="pending()" [disabled]="form.invalid || pending()" />

        <p class="saas-login__footer">
          ¿Sos usuario del laboratorio? Ingresá por <a routerLink="/login">/login</a>.
        </p>
      </form>
    </div>
  `,
  styles: [`
    /* Consola de plataforma: login claro con acento índigo (fuera del saas-shell,
       así que los tokens se declaran acá). */
    :host {
      display: block; min-height: 100vh;
      --saas-accent: #6366f1;
      --saas-accent-strong: #4f46e5;
      --brand-primary: #6366f1;
      --p-primary-color: #6366f1;
      --p-primary-contrast-color: #ffffff;
      --p-primary-50:  #eef2ff;
      --p-primary-100: #e0e7ff;
      --p-primary-200: #c7d2fe;
      --p-primary-300: #a5b4fc;
      --p-primary-400: #818cf8;
      --p-primary-500: #6366f1;
      --p-primary-600: #4f46e5;
      --p-primary-700: #4338ca;
      --p-primary-800: #3730a3;
      --p-primary-900: #312e81;
      --p-primary-950: #1e1b4b;
      --p-button-primary-background: #4f46e5;
      --p-button-primary-border-color: #4f46e5;
      --p-button-primary-color: #ffffff;
      --p-button-primary-hover-background: #4338ca;
      --p-button-primary-hover-border-color: #4338ca;
      --p-button-primary-active-background: #3730a3;
      --p-button-primary-active-border-color: #3730a3;
      background: linear-gradient(135deg, #eef2ff 0%, #f7f8fa 55%, #faf5ff 100%);
    }
    .saas-login { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .saas-login__card {
      background: #fff; color: #1a1a2e; border: 1px solid #e6e8ef; border-radius: 14px;
      padding: 32px; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 20px 50px rgba(30,27,75,.10);
    }
    .saas-login__brand { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .saas-login__brand img { width: 40px; height: 40px; padding: 6px; border-radius: 10px; background: rgba(99,102,241,.10); }
    .saas-login__brand h1 { margin: 6px 0 0; font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .saas-login__brand p { margin: 0; font-size: 12px; color: #6b7280; }
    .saas-login__field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 500; color: #6b7280; }
    .saas-login__field input { width: 100%; }
    .saas-login__error { background: #fdecee; color: #b42318; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
    .saas-login__footer { font-size: 12px; color: #6b7280; text-align: center; margin: 4px 0 0; }
    .saas-login__footer a { color: #4f46e5; font-weight: 600; }
  `],
})
export class SaasLoginPage {
  readonly form;
  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  constructor() {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.pending.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await this.auth.loginInternal(email, password);
      if (!res.token) {
        this.errorMessage.set('No se pudo iniciar sesión.');
        return;
      }
      this.tokens.setToken(res.token);
      if (!this.tokens.getRoles().includes('SAAS_ADMIN')) {
        this.tokens.removeToken();
        this.errorMessage.set('Este acceso es solo para administradores de plataforma.');
        return;
      }
      await this.router.navigate(['/saas']);
    } catch (err) {
      this.tokens.removeToken();
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      this.errorMessage.set(status === 401 ? 'Credenciales inválidas.' : 'No se pudo iniciar sesión.');
    } finally {
      this.pending.set(false);
    }
  }
}
