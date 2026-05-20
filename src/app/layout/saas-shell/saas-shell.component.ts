import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaasSidebarComponent } from './saas-sidebar/saas-sidebar.component';
import { SaasTopbarComponent } from './saas-topbar/saas-topbar.component';

@Component({
  selector: 'saas-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SaasSidebarComponent, SaasTopbarComponent],
  template: `
    <saas-topbar />
    <div class="saas-shell__body">
      <saas-sidebar />
      <main class="saas-shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host {
      --saas-bg-page:      #1a1b3a;
      --saas-bg-card:      #232447;
      --saas-bg-card-alt:  #2a2c52;
      --saas-border:       rgba(255,255,255,.08);
      --saas-text:         #e2e8f0;
      --saas-text-muted:   #94a3b8;
      --saas-text-on-card: #fde68a;
      --saas-accent:       #fbbf24;

      display: flex; flex-direction: column; min-height: 100vh;
      background: var(--saas-bg-page); color: var(--saas-text);
    }
    .saas-shell__body { display: flex; flex: 1; }
    .saas-shell__main { flex: 1; padding: 24px; overflow-x: hidden; }

    /* ── PrimeNG overrides scoped to the SaaS shell ── */

    /* p-table / p-datatable */
    :host ::ng-deep .p-datatable,
    :host ::ng-deep .p-datatable .p-datatable-table {
      background: transparent; color: var(--saas-text);
    }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      background: var(--saas-bg-card-alt); color: var(--saas-text-muted);
      border-color: var(--saas-border);
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr {
      background: var(--saas-bg-card); color: var(--saas-text);
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr:hover {
      background: var(--saas-bg-card-alt) !important;
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      border-color: var(--saas-border); color: var(--saas-text);
    }
    :host ::ng-deep .p-datatable-wrapper { background: transparent; }

    /* p-paginator */
    :host ::ng-deep .p-paginator {
      background: var(--saas-bg-card); color: var(--saas-text-muted);
      border-color: var(--saas-border);
    }
    :host ::ng-deep .p-paginator .p-paginator-page,
    :host ::ng-deep .p-paginator .p-paginator-prev,
    :host ::ng-deep .p-paginator .p-paginator-next,
    :host ::ng-deep .p-paginator .p-paginator-first,
    :host ::ng-deep .p-paginator .p-paginator-last {
      color: var(--saas-text-muted);
    }
    :host ::ng-deep .p-paginator .p-paginator-page.p-highlight {
      background: var(--saas-accent); color: #1a1b3a;
    }

    /* p-tabs */
    :host ::ng-deep .p-tabs .p-tablist,
    :host ::ng-deep .p-tabs .p-tablist-content {
      background: transparent;
    }
    :host ::ng-deep .p-tabs .p-tablist .p-tab {
      background: transparent; color: var(--saas-text-muted); border-color: var(--saas-border);
    }
    :host ::ng-deep .p-tabs .p-tablist .p-tab[data-p-active="true"],
    :host ::ng-deep .p-tabs .p-tablist .p-tab.p-tab-active {
      color: var(--saas-text-on-card); border-color: var(--saas-accent);
    }
    :host ::ng-deep .p-tabs .p-tabpanels {
      background: transparent; color: var(--saas-text);
    }
    :host ::ng-deep .p-tabpanel {
      background: transparent; color: var(--saas-text);
    }

    /* p-inputtext */
    :host ::ng-deep .p-inputtext,
    :host ::ng-deep input.p-inputtext,
    :host ::ng-deep textarea.p-inputtext {
      background: var(--saas-bg-card-alt); color: var(--saas-text);
      border-color: var(--saas-border);
    }
    :host ::ng-deep .p-inputtext:enabled:focus {
      border-color: var(--saas-accent); box-shadow: 0 0 0 2px rgba(251,191,36,.18);
    }
    :host ::ng-deep .p-inputtext:disabled,
    :host ::ng-deep .p-inputtext[readonly] {
      background: rgba(255,255,255,.02); color: var(--saas-text-muted);
    }

    /* p-select / p-multiselect / datepicker */
    :host ::ng-deep .p-select,
    :host ::ng-deep .p-multiselect,
    :host ::ng-deep .p-datepicker-input {
      background: var(--saas-bg-card-alt); color: var(--saas-text); border-color: var(--saas-border);
    }
  `],
})
export class SaasShellComponent {}
