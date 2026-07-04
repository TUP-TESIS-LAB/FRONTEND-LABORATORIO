import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'saas-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <header class="saas-topbar">
      <div class="saas-topbar__brand">
        <img src="logo.svg" alt="" class="saas-topbar__logo" />
        <span class="saas-topbar__title">Platform Admin</span>
        <span class="saas-topbar__badge">SaaS</span>
      </div>
      <div class="saas-topbar__actions">
        <p-button [text]="true" icon="pi pi-sign-out" label="Salir" (onClick)="logout()" />
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .saas-topbar {
      display: flex; align-items: center; gap: 10px;
      height: 56px; padding: 0 var(--space-4, 16px);
      background: var(--saas-surface, #fff);
      color: var(--saas-text, #1a1a2e);
      border-bottom: 1px solid var(--saas-border, #e6e8ef);
    }
    .saas-topbar__brand { display: flex; align-items: center; gap: 10px; }
    .saas-topbar__logo {
      width: 30px; height: 30px; border-radius: 8px; object-fit: contain;
      background: var(--saas-accent-tint, rgba(99,102,241,.10)); padding: 4px;
    }
    .saas-topbar__title { font-weight: 700; font-size: 15px; color: var(--saas-text, #1a1a2e); }
    .saas-topbar__badge {
      font-size: 10px; font-weight: 700; letter-spacing: .04em; padding: 3px 7px; border-radius: 999px;
      background: var(--saas-accent-tint, rgba(99,102,241,.10)); color: var(--saas-accent-strong, #4f46e5);
    }
    .saas-topbar__actions { margin-left: auto; }
  `],
})
export class SaasTopbarComponent {
  readonly loggedOut = output<void>();
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokens.removeToken();
    this.router.navigate(['/saas/login']);
    this.loggedOut.emit();
  }
}
