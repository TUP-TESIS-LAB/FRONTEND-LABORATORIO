// src/app/features/saas-admin/pages/tenants-list/tenants-list.page.ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Tenant } from '../../models/tenant.model';
import { TenantStatusPipe } from '../../models/tenant-status.pipe';
import {
  loadTenants, activateTenant, deactivateTenant, softDeleteTenant,
} from '../../store/saas-admin.actions';
import { selectTenantsList } from '../../store/saas-admin.selectors';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

type Filter = 'all' | 'active' | 'inactive' | 'deleted';

@Component({
  selector: 'saas-tenants-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, TableModule, ButtonModule, TagModule, InputTextModule,
    TooltipModule, ConfirmDialogModule, TenantStatusPipe, PageHeaderComponent,
  ],
  template: `
    <ui-page-header heading="Tenants">
      <a routerLink="/saas/tenants/nuevo">
        <p-button label="Nuevo tenant" />
      </a>
    </ui-page-header>

    <div class="toolbar">
      <span class="p-input-icon-left toolbar__search">
        <i class="pi pi-search"></i>
        <input pInputText placeholder="Buscar por código o nombre…"
               (input)="search.set($any($event.target).value)" />
      </span>
      @for (f of filters; track f.value) {
        <p-button [label]="f.label" size="small"
                  [severity]="filter() === f.value ? 'primary' : 'secondary'"
                  [outlined]="filter() !== f.value"
                  (onClick)="filter.set(f.value)" />
      }
    </div>

    <p-table [value]="visible()" [paginator]="visible().length > 10" [rows]="10" dataKey="id">
      <ng-template pTemplate="header">
        <tr>
          <th>Código</th><th>Nombre</th><th>Status</th><th>Active</th>
          <th class="text-right" style="width:200px">Acciones</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-t>
        <tr [class.row-deleted]="!!t.deletedAt">
          <td><code>{{ t.code }}</code></td>
          <td>{{ t.name }}</td>
          <td><p-tag [value]="t.status | tenantStatus" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" /></td>
          <td>
            @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
            @else if (!t.active) { <p-tag value="Inactivo" severity="warn" /> }
            @else { <p-tag value="Activo" severity="success" /> }
          </td>
          <td class="text-right">
            <a [routerLink]="['/saas/tenants', t.id]">
              <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
            </a>
            @if (t.status === 'ACTIVE') {
              <p-button [text]="true" icon="pi pi-pause" pTooltip="Desactivar" (onClick)="confirmDeactivate(t)" />
            } @else if (!t.deletedAt) {
              <p-button [text]="true" icon="pi pi-play" pTooltip="Activar" (onClick)="confirmActivate(t)" />
            }
            @if (!t.deletedAt) {
              <p-button [text]="true" icon="pi pi-trash" pTooltip="Eliminar" severity="danger" (onClick)="confirmSoftDelete(t)" />
            }
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="5" class="empty">Sin tenants para los filtros actuales.</td></tr>
      </ng-template>
    </p-table>

    <p-confirmDialog styleClass="saas-themed" />
  `,
  styles: [`
    :host { display: block; color: var(--saas-text, #1a1a2e); }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    .toolbar__search input { min-width: 280px; }
    .row-deleted td { text-decoration: line-through; color: var(--saas-text-muted, #6b7280); }
    .text-right { text-align: right; }
    .text-right a { text-decoration: none; }
    .empty { text-align: center; color: var(--saas-text-muted, #6b7280); padding: 24px; font-style: italic; }
  `],
})
export class TenantsListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  private readonly tenants = this.store.selectSignal(selectTenantsList);

  protected readonly filter = signal<Filter>('all');
  protected readonly search = signal('');

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'all',      label: 'Todos' },
    { value: 'active',   label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'deleted',  label: 'Eliminados' },
  ];

  protected readonly visible = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.tenants().filter((t) => {
      if (f === 'active'   && !(t.status === 'ACTIVE'   && t.active && !t.deletedAt)) return false;
      if (f === 'inactive' && !(t.status === 'INACTIVE' && t.active && !t.deletedAt)) return false;
      if (f === 'deleted'  && !(!t.active || !!t.deletedAt))                          return false;
      if (q && !`${t.code} ${t.name}`.toLowerCase().includes(q))                       return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.store.dispatch(loadTenants());
  }

  confirmActivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Activar tenant?',
      message: `${t.code} — ${t.name}`,
      acceptLabel: 'Activar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(activateTenant({ id: t.id })),
    });
  }
  confirmDeactivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Desactivar tenant?',
      message: `${t.code} — ${t.name}`,
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deactivateTenant({ id: t.id })),
    });
  }
  confirmSoftDelete(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Eliminar tenant?',
      message: 'Esto desactivará el tenant y dejará de ser visible. Los datos no se borran.',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(softDeleteTenant({ id: t.id })),
    });
  }
}
