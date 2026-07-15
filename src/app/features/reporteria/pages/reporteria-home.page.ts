import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { TokenService } from '@core/auth/token.service';
import { REPORT_GROUPS } from '../catalog';
import { ReportDef, ReportGroup } from '../models/report.model';

/** Índice de reportes, filtrado por rol (mismo patrón que usan los dashboards: TokenService.getRoles()). */
@Component({
  selector: 'rpt-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="rpt-home">
      <ui-page-header heading="Reportes" subtitle="Reportes disponibles según tu rol." />

      @if (visibleGroups().length === 0) {
        <ui-empty-state
          icon="pi-chart-bar"
          heading="No hay reportes disponibles"
          description="Tu rol no tiene reportes asignados." />
      } @else {
        @for (group of visibleGroups(); track group.key) {
          <section class="rpt-home__group">
            <h2 class="rpt-home__group-title">{{ group.label }}</h2>
            <div class="rpt-home__grid">
              @for (report of group.reports; track report.id) {
                <a class="rpt-home__card" [routerLink]="[report.id]">
                  <span class="rpt-home__card-id">{{ report.id }}</span>
                  <span class="rpt-home__card-title">{{ report.title }}</span>
                  <span class="rpt-home__card-desc">{{ report.description }}</span>
                </a>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .rpt-home { display: flex; flex-direction: column; gap: var(--space-6); }
    .rpt-home__group-title { margin: 0 0 var(--space-3); font-size: 15px; font-weight: 700; color: var(--ds-text); }
    .rpt-home__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-3); }
    .rpt-home__card {
      display: flex; flex-direction: column; gap: 4px;
      padding: var(--space-4); border-radius: 10px;
      border: 1px solid var(--ds-border, #e8edf3); background: white;
      text-decoration: none; color: inherit;
      transition: border-color 120ms, box-shadow 120ms;
    }
    .rpt-home__card:hover { border-color: var(--brand-primary); box-shadow: 0 1px 2px rgba(28,30,55,.06); }
    .rpt-home__card-id { font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--ds-text-muted); text-transform: uppercase; }
    .rpt-home__card-title { font-size: 14px; font-weight: 600; color: var(--ds-text); }
    .rpt-home__card-desc { font-size: 12.5px; color: var(--ds-text-muted); }
  `],
})
export class ReporteriaHomePage {
  private readonly tokenService = inject(TokenService);

  private readonly userRoles = computed(() => this.tokenService.getRoles());

  protected readonly visibleGroups = computed<ReportGroup[]>(() => {
    const roles = this.userRoles();
    return REPORT_GROUPS
      .map((group) => ({
        ...group,
        reports: group.reports.filter((r: ReportDef) => r.roles.some((role) => roles.includes(role))),
      }))
      .filter((group) => group.reports.length > 0);
  });
}
