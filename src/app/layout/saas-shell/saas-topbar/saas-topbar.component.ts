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
      display: flex; align-items: center; gap: 12px;
      height: 48px; padding: 0 16px;
      background: #1e1b4b; color: #fde68a;
      box-shadow: 0 1px 3px rgba(0,0,0,.35);
    }
    .saas-topbar__brand { display: flex; align-items: center; gap: 8px; }
    .saas-topbar__logo { width: 24px; height: 24px; border-radius: 4px; background: rgba(251,191,36,.12); }
    .saas-topbar__title { font-weight: 600; font-size: 14px; color: #fde68a; }
    .saas-topbar__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(251,191,36,.18); color: #fbbf24; }
    .saas-topbar__actions { margin-left: auto; }
    :host ::ng-deep .saas-topbar__actions .p-button { color: #fde68a; }
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
