import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import {
  clearSelectedTenant, loadTenant, loadTenantModules, loadTenantWhiteLabel,
} from '../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenant } from '../../store/saas-admin.selectors';
import { TenantInfoTabComponent } from './tabs/tenant-info-tab.component';
import { TenantModulesTabComponent } from './tabs/tenant-modules-tab.component';
import { TenantWhiteLabelTabComponent } from './tabs/tenant-white-label-tab.component';
import { TenantStatusPipe } from '../../models/tenant-status.pipe';

@Component({
  selector: 'saas-tenant-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, TabsModule, TagModule, TenantInfoTabComponent, TenantModulesTabComponent, TenantWhiteLabelTabComponent, TenantStatusPipe],
  template: `
    <header class="detail-header">
      <a routerLink="/saas/tenants" class="back">
        <p-button [text]="true" label="Volver" />
      </a>
      @if (tenant(); as t) {
        <div class="detail-header__title">
          <h1>{{ t.name }}</h1>
          <code>{{ t.code }}</code>
          <p-tag [value]="t.status | tenantStatus" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
          @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
        </div>
      } @else if (pending()) {
        <span class="muted">Cargando…</span>
      } @else {
        <span class="muted">Tenant no encontrado.</span>
      }
      <a [routerLink]="['/saas/tenants', numericId(), 'editar']" style="margin-left: auto;">
        <p-button label="Editar" [outlined]="true" />
      </a>
    </header>

    @if (tenant()) {
      <p-tabs value="info">
        <p-tablist>
          <p-tab value="info">Información</p-tab>
          <p-tab value="modules">Módulos</p-tab>
          <p-tab value="white-label">White label</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="info">
            <tenant-info-tab [tenant]="tenant()" />
          </p-tabpanel>
          <p-tabpanel value="modules">
            <tenant-modules-tab [tenantId]="numericId()" />
          </p-tabpanel>
          <p-tabpanel value="white-label">
            <tenant-white-label-tab [tenantId]="numericId()" />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    }
  `,
  styles: [`
    :host { display: block; color: #e2e8f0; }
    .detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .detail-header a { text-decoration: none; }
    .detail-header__title { display: flex; align-items: center; gap: 8px; }
    .detail-header h1 { margin: 0; color: #fde68a; font-size: 20px; }
    .detail-header code { color: #94a3b8; font-size: 12px; }
    .muted { color: #94a3b8; font-size: 13px; }
  `],
})
export class TenantDetailPage implements OnInit, OnDestroy {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  protected readonly tenant = this.store.selectSignal(selectSelectedTenant);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly numericId = computed(() => Number(this.id()));

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) return;
    this.store.dispatch(loadTenant({ id: numericId }));
    this.store.dispatch(loadTenantModules({ tenantId: numericId }));
    this.store.dispatch(loadTenantWhiteLabel({ tenantId: numericId }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedTenant());
  }
}
