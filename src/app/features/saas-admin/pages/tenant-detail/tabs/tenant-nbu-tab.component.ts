import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  activateAllNbuCatalog, deactivateAllNbuCatalog, loadNbuCatalogSummary,
} from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantNbuSummary } from '../../../store/saas-admin.selectors';

/**
 * KAN-257: tab "Catálogo NBU" del detalle de tenant. Muestra activos/total y permite activar o
 * desactivar TODO el catálogo maestro para el tenant, con confirmación (acciones masivas).
 */
@Component({
  selector: 'tenant-nbu-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog [draggable]="false" />

    <section class="nbu">
      <p class="muted">
        Activá el catálogo NBU maestro como análisis de este tenant, o desactivalo por completo.
        El laboratorio puede ajustar cada análisis después.
      </p>

      <div class="nbu-summary">
        @if (summary(); as s) {
          <span class="nbu-summary__count">{{ s.activeCount }} / {{ s.catalogTotal }}</span>
          <span class="muted">análisis activos</span>
        } @else {
          <span class="muted">Cargando resumen…</span>
        }
      </div>

      <div class="nbu-actions">
        <p-button
          label="Activar todo el catálogo"
          icon="pi pi-check-circle"
          [disabled]="pending() || allActive()"
          (onClick)="askActivateAll()" />
        <p-button
          label="Desactivar todo"
          icon="pi pi-times-circle"
          severity="danger"
          [outlined]="true"
          [disabled]="pending() || noneActive()"
          (onClick)="askDeactivateAll()" />
      </div>
    </section>
  `,
  styles: [`
    .nbu { display: flex; flex-direction: column; gap: 16px; }
    .muted { color: var(--saas-text-muted, #6b7280); font-size: 13px; }
    .nbu-summary { display: flex; align-items: baseline; gap: 8px; }
    .nbu-summary__count { color: var(--saas-text, #1a1a2e); font-size: 22px; font-weight: 700; }
    .nbu-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  `],
})
export class TenantNbuTabComponent implements OnInit {
  readonly tenantId = input.required<number>();

  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  protected readonly summary = this.store.selectSignal(selectSelectedTenantNbuSummary);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  protected readonly allActive = computed(() => {
    const s = this.summary();
    return !!s && s.catalogTotal > 0 && s.activeCount >= s.catalogTotal;
  });
  protected readonly noneActive = computed(() => {
    const s = this.summary();
    return !!s && s.activeCount === 0;
  });

  ngOnInit(): void {
    this.store.dispatch(loadNbuCatalogSummary({ tenantId: this.tenantId() }));
  }

  askActivateAll(): void {
    this.confirm.confirm({
      header: 'Activar todo el catálogo NBU',
      message: 'Se activarán todos los análisis del catálogo maestro para este tenant. ¿Continuar?',
      acceptLabel: 'Activar todo',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(activateAllNbuCatalog({ tenantId: this.tenantId() })),
    });
  }

  askDeactivateAll(): void {
    this.confirm.confirm({
      header: 'Desactivar todo el catálogo NBU',
      message: 'Se desactivarán todos los análisis activos de este tenant. ¿Continuar?',
      acceptLabel: 'Desactivar todo',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deactivateAllNbuCatalog({ tenantId: this.tenantId() })),
    });
  }
}
