import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { loadTenants } from '../../store/saas-admin.actions';
import { selectDashboardCounts, selectTenantsList } from '../../store/saas-admin.selectors';
import { TenantStatusPipe } from '../../models/tenant-status.pipe';
import { Tenant } from '../../models/tenant.model';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

@Component({
  selector: 'saas-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, ButtonModule, TagModule, TenantStatusPipe,
    PageHeaderComponent, StatCardComponent, DataTableComponent, UiCellDirective,
  ],
  template: `
    <ui-page-header heading="Dashboard" subtitle="Resumen de la plataforma.">
      <p-button label="Nuevo tenant" icon="pi pi-plus" routerLink="/saas/tenants/nuevo" />
    </ui-page-header>

    <section class="ui-stats-grid">
      <ui-stat-card label="Total tenants" [value]="counts().total"
                    icon="pi-building" accentColor="var(--saas-accent)" />
      <ui-stat-card label="Activos" [value]="counts().active"
                    icon="pi-check-circle" accentColor="var(--ds-success)" />
      <ui-stat-card label="Inactivos" [value]="counts().inactive"
                    icon="pi-pause-circle" accentColor="var(--ds-warning)" />
      <ui-stat-card label="Eliminados" [value]="counts().deleted"
                    icon="pi-trash" accentColor="var(--ds-danger)" />
    </section>

    <section class="recent">
      <div class="recent__head">
        <h2 class="ui-text-label">Tenants recientes</h2>
        <a routerLink="/saas/tenants" class="recent__link">Ver todos</a>
      </div>
      <ui-table
        [value]="recent()"
        [columns]="cols"
        dataKey="id"
        [showView]="true"
        (view)="goToTenant($event)"
        emptyHeading="Sin tenants todavía"
        emptyIcon="pi-building">
        <ng-template uiCell="code" let-t>
          <code class="mono">{{ t.code }}</code>
        </ng-template>
        <ng-template uiCell="status" let-t>
          <p-tag [value]="t.status | tenantStatus"
                 [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
        </ng-template>
      </ui-table>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .ui-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4, 16px);
      margin-bottom: var(--space-6, 24px);
    }
    @media (max-width: 900px) { .ui-stats-grid { grid-template-columns: repeat(2, 1fr); } }

    .recent__head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-3, 12px);
    }
    .recent__head h2 { margin: 0; }
    .recent__link {
      font-size: 13px; font-weight: 600;
      color: var(--saas-accent-strong, #4f46e5); text-decoration: none;
    }
    .recent__link:hover { text-decoration: underline; }
    .mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px; color: var(--saas-text, #1a1a2e); }
  `],
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly counts = this.store.selectSignal(selectDashboardCounts);
  private readonly tenants = this.store.selectSignal(selectTenantsList);
  protected readonly recent = computed(() => [...this.tenants()].sort((a, b) => b.id - a.id).slice(0, 5));

  protected readonly cols: TableColumn[] = [
    { field: 'code', header: 'Código' },
    { field: 'name', header: 'Nombre' },
    { field: 'status', header: 'Estado' },
  ];

  ngOnInit(): void {
    this.store.dispatch(loadTenants());
  }

  protected goToTenant(row: unknown): void {
    this.router.navigate(['/saas/tenants', (row as Tenant).id]);
  }
}
