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
    :host { display: block; min-height: 100vh; background: linear-gradient(135deg, #0f0c29 0%, #1e1b4b 60%, #3b2f00 100%); }
    .saas-login { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .saas-login__card { background: #1a1b3a; color: #e2e8f0; border-radius: 12px; padding: 32px; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.4); }
    .saas-login__brand { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .saas-login__brand img { width: 36px; height: 36px; }
    .saas-login__brand h1 { margin: 4px 0 0; font-size: 18px; color: #fde68a; }
    .saas-login__brand p { margin: 0; font-size: 12px; color: #a5b4fc; }
    .saas-login__field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #c7d2fe; }
    .saas-login__field input { width: 100%; }
    .saas-login__error { background: rgba(239,68,68,.12); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
    .saas-login__footer { font-size: 11px; color: #94a3b8; text-align: center; margin: 4px 0 0; }
    .saas-login__footer a { color: #fde68a; }
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
