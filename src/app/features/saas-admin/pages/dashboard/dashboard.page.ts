import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { loadTenants } from '../../store/saas-admin.actions';
import { selectDashboardCounts, selectTenantsList } from '../../store/saas-admin.selectors';

@Component({
  selector: 'saas-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, TagModule],
  template: `
    <header class="page-header">
      <h1>Dashboard</h1>
      <p>Resumen de la plataforma.</p>
    </header>

    <section class="stats">
      <div class="stat"><div class="stat__label">Total tenants</div><div class="stat__num">{{ counts().total }}</div></div>
      <div class="stat"><div class="stat__label">Activos</div><div class="stat__num">{{ counts().active }}</div></div>
      <div class="stat"><div class="stat__label">Inactivos</div><div class="stat__num">{{ counts().inactive }}</div></div>
      <div class="stat"><div class="stat__label">Eliminados</div><div class="stat__num">{{ counts().deleted }}</div></div>
    </section>

    <section class="quick">
      <h2>Acciones rápidas</h2>
      <div class="quick__actions">
        <a routerLink="/saas/tenants"><p-button label="Ver todos los tenants" icon="pi pi-building" [outlined]="true" /></a>
      </div>
    </section>

    <section class="recent">
      <h2>Tenants recientes</h2>
      <table class="recent__table">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Status</th><th class="text-right">Acciones</th></tr>
        </thead>
        <tbody>
          @for (t of recent(); track t.id) {
            <tr>
              <td><code>{{ t.code }}</code></td>
              <td>{{ t.name }}</td>
              <td><p-tag [value]="t.status" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" /></td>
              <td class="text-right">
                <a [routerLink]="['/saas/tenants', t.id]">Ver detalle</a>
              </td>
            </tr>
          }
          @if (recent().length === 0) {
            <tr><td colspan="4" class="empty">Sin tenants todavía.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    :host { display: block; color: #e2e8f0; }
    .page-header h1 { color: #fde68a; margin: 0 0 4px; font-size: 22px; }
    .page-header p  { color: #94a3b8; margin: 0 0 16px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { background: rgba(255,255,255,.04); border-radius: 10px; padding: 16px; }
    .stat__num   { font-size: 28px; font-weight: 700; color: #fde68a; line-height: 1; }
    .stat__label { font-size: 12px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .quick { margin-bottom: 24px; }
    .quick h2, .recent h2 { color: #c7d2fe; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }
    .recent__table { width: 100%; border-collapse: collapse; background: var(--saas-bg-card, rgba(255,255,255,.03)); border-radius: 8px; overflow: hidden; }
    .recent__table th, .recent__table td { padding: 10px 14px; font-size: 13px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.04); color: var(--saas-text, #e2e8f0); }
    .recent__table th { color: var(--saas-text-muted, #94a3b8); font-weight: 600; background: var(--saas-bg-card-alt, #2a2c52); }
    .recent__table tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #64748b; padding: 18px; font-style: italic; }
    .text-right { text-align: right; }
  `],
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  protected readonly counts = this.store.selectSignal(selectDashboardCounts);
  private readonly tenants = this.store.selectSignal(selectTenantsList);
  protected readonly recent = computed(() => [...this.tenants()].sort((a, b) => b.id - a.id).slice(0, 5));

  ngOnInit(): void {
    this.store.dispatch(loadTenants());
  }
}
