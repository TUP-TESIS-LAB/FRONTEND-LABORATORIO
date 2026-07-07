import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { AccessRegistry } from '@core/access/access-registry';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { VolumenTabComponent } from './tabs/volumen-tab.component';
import { PreanaliticaTabComponent } from './tabs/preanalitica-tab.component';
import { PostanaliticaTabComponent } from './tabs/postanalitica-tab.component';

/**
 * Dashboard de métricas de Analítica (KAN-204). Feature CORE — sin `moduleActiveGuard` en
 * la ruta (`analitica.routes.ts`); cada tab se gatea individualmente por su
 * `AccessSection` (ANALITICA / PREANALITICA / POSTANALITICA), espejando el
 * `@PreAuthorize` de cada controller del backend. El rol (BIOQUIMICO/ADMINISTRADOR) lo
 * exige la ruta vía `hasRoleGuard`.
 */
@Component({
  selector: 'lab-analitica-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TabsModule, PageHeaderComponent, EmptyStateComponent,
    VolumenTabComponent, PreanaliticaTabComponent, PostanaliticaTabComponent,
  ],
  template: `
    <ui-page-header heading="Métricas de Analítica" subtitle="Volumen, preanalítica y postanalítica del laboratorio." />

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
              <lab-analitica-volumen-tab />
            </p-tabpanel>
          }
          @if (hasPreanalitica()) {
            <p-tabpanel value="preanalitica">
              <lab-analitica-preanalitica-tab />
            </p-tabpanel>
          }
          @if (hasPostanalitica()) {
            <p-tabpanel value="postanalitica">
              <lab-analitica-postanalitica-tab />
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
  `,
})
export class AnaliticaDashboardPage {
  private readonly access = inject(AccessRegistry);

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
}
