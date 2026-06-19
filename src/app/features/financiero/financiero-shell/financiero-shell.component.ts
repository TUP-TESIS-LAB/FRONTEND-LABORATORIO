import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HasRoleDirective } from '@shared/directives/has-role.directive';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'fin-financiero-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, HasRoleDirective, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header heading="Financiero" />

    <nav class="fin-shell__tabs" role="tablist">
      <a routerLink="caja" routerLinkActive="is-active" role="tab">
        <i class="pi pi-wallet"></i> Caja
      </a>
      <a routerLink="cobros" routerLinkActive="is-active" role="tab">
        <i class="pi pi-receipt"></i> Cobros
      </a>
      <ng-template hasRole="SAAS_ADMIN">
        <a routerLink="config-fiscal" routerLinkActive="is-active" role="tab">
          <i class="pi pi-verified"></i> Config fiscal
        </a>
      </ng-template>
    </nav>

    <section class="fin-shell__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    :host { display: block; }
    .fin-shell__tabs { display: flex; gap: var(--space-2); border-bottom: 1px solid var(--ds-surface); overflow-x: auto; margin-bottom: var(--space-5); }
    .fin-shell__tabs a { padding: var(--space-3) var(--space-4); color: var(--ds-text-muted); text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; display: flex; align-items: center; gap: var(--space-2); }
    .fin-shell__tabs a.is-active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600; }
    .fin-shell__body { display: block; }
  `],
})
export class FinancieroShellComponent {}
