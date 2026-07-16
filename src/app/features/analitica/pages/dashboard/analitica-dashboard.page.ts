import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TabsModule } from 'primeng/tabs';
import { AccessRegistry } from '@core/access/access-registry';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { MetricFilter, MetricFilterBarComponent } from '@shared/metrics';
import { selectBranches } from '../../store/extraction/extraction.selectors';
import { loadBranches } from '../../store/extraction/extraction.actions';
import { VolumenTabComponent } from './tabs/volumen-tab.component';
import { PreanaliticaTabComponent } from './tabs/preanalitica-tab.component';
import { PostanaliticaTabComponent } from './tabs/postanalitica-tab.component';
import { defaultMetricDateRange } from './metrics-date-range.util';

/**
 * Dashboard de métricas de Analítica (KAN-204). Feature CORE — sin `moduleActiveGuard` en
 * la ruta (`analitica.routes.ts`); cada tab se gatea individualmente por su
 * `AccessSection` (ANALITICA / PREANALITICA / POSTANALITICA), espejando el
 * `@PreAuthorize` de cada controller del backend. El rol (BIOQUIMICO/ADMINISTRADOR) lo
 * exige la ruta vía `hasRoleGuard`.
 *
 * El filtro (rango de fechas / sucursal / granularidad) es ÚNICO para las 3 tabs y vive
 * acá — se muestra una sola vez, junto al título, en vez de repetido dentro de cada tab.
 */
@Component({
  selector: 'lab-analitica-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TabsModule, PageHeaderComponent, EmptyStateComponent, PanelCardComponent, MetricFilterBarComponent,
    VolumenTabComponent, PreanaliticaTabComponent, PostanaliticaTabComponent,
  ],
  template: `
    <div class="ana-dash">
      <ui-page-header heading="Métricas de Analítica" subtitle="Volumen, preanalítica y postanalítica del laboratorio." />

      <ui-panel-card>
        <ui-metric-filter-bar [branches]="branches()" [initial]="filter()" (filterChange)="filter.set($event)" />
      </ui-panel-card>

      @if (defaultTab(); as tab) {
        <p-tabs [value]="tab">
          <p-tablist>
            @if (hasVolumen()) {
              <p-tab value="volumen">Volumen</p-tab>
            }
            @if (hasPreanalitica()) {
              <p-tab value="preanalitica">Preanalítica</p-tab>
            }
            @if (hasPostanalitica()) {
              <p-tab value="postanalitica">Postanalítica</p-tab>
            }
          </p-tablist>
          <p-tabpanels>
            @if (hasVolumen()) {
              <p-tabpanel value="volumen">
                <lab-analitica-volumen-tab [filter]="filter()" />
              </p-tabpanel>
            }
            @if (hasPreanalitica()) {
              <p-tabpanel value="preanalitica">
                <lab-analitica-preanalitica-tab [filter]="filter()" />
              </p-tabpanel>
            }
            @if (hasPostanalitica()) {
              <p-tabpanel value="postanalitica">
                <lab-analitica-postanalitica-tab [filter]="filter()" />
              </p-tabpanel>
            }
          </p-tabpanels>
        </p-tabs>
      } @else {
        <ui-empty-state
          icon="pi-lock"
          heading="Sin acceso a métricas"
          description="No tenés ninguna sección de Analítica habilitada para ver este dashboard." />
      }
    </div>
  `,
  styles: [`
    .ana-dash { display: flex; flex-direction: column; gap: var(--space-5, 18px); }
  `],
})
export class AnaliticaDashboardPage implements OnInit {
  private readonly store = inject(Store);
  private readonly access = inject(AccessRegistry);

  protected readonly branches = this.store.selectSignal(selectBranches);
  protected readonly filter = signal<MetricFilter>({ ...defaultMetricDateRange(), granularity: 'DAY' });

  protected readonly hasVolumen = computed(() => this.access.has('ANALITICA'));
  protected readonly hasPreanalitica = computed(() => this.access.has('PREANALITICA'));
  protected readonly hasPostanalitica = computed(() => this.access.has('POSTANALITICA'));

  /** Primera tab habilitada; `null` si el usuario no tiene ninguna de las 3 secciones. */
  protected readonly defaultTab = computed<'volumen' | 'preanalitica' | 'postanalitica' | null>(() => {
    if (this.hasVolumen()) return 'volumen';
    if (this.hasPreanalitica()) return 'preanalitica';
    if (this.hasPostanalitica()) return 'postanalitica';
    return null;
  });

  ngOnInit(): void {
    this.store.dispatch(loadBranches());
  }
}
