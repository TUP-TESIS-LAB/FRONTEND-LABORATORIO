import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { TokenService } from '@core/auth/token.service';
import { TenantStore } from '@core/tenant/tenant.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <header class="topbar">
      <p-button icon="pi pi-bars" [text]="true" severity="secondary"
                (onClick)="menuToggle.emit()" ariaLabel="Abrir menú"
                styleClass="ui-show-mobile" />

      <span class="topbar__title">{{ tenantStore.config()?.name ?? 'LabCore' }}</span>

      <div style="margin-left: auto">
        <p-button icon="pi pi-sign-out" [text]="true" severity="secondary"
                  (onClick)="logout()" ariaLabel="Cerrar sesión" />
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: var(--ds-topbar-h);
      padding: 0 var(--space-6);
      background: white;
      border-bottom: 1px solid var(--ds-surface);
      flex-shrink: 0;
    }
    .topbar__title {
      font-weight: 600;
      font-size: 16px;
      color: var(--brand-primary);
    }
    @media (max-width: 767px) {
      .topbar { padding: 0 var(--space-4); }
    }
  `],
})
export class TopbarComponent {
  readonly menuToggle = output<void>();
  protected readonly tenantStore = inject(TenantStore);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokens.removeToken();
    this.router.navigate(['/login']);
  }
}
