import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TableLazyLoadEvent } from 'primeng/table';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { ExportFormat, ReportDef, ReportQuery } from '../models/report.model';
import { ReportFiltersComponent, ReportBranchOption } from './report-filters.component';
import { ReportExportButtonsComponent } from './report-export-buttons.component';

/**
 * Traduce un evento de paginación/orden de la tabla (`TableLazyLoadEvent`) a un patch de
 * query, tomando de `current` los valores de fallback cuando el evento no los trae (paginar
 * sin reordenar conserva el orden vigente). Función pura y sin dependencias de Angular —
 * concentra la lógica de `onLazyLoad` para testearla sin depender del binding de `input()`,
 * que en el entorno de vitest del proyecto no propaga valores de forma confiable.
 */
export function resolveLazyLoadPatch(
  e: TableLazyLoadEvent,
  current: Pick<ReportQuery, 'size' | 'sortField' | 'sortDir'>,
): Partial<ReportQuery> {
  const size = e.rows ?? current.size;
  const page = Math.floor((e.first ?? 0) / size);
  const sortField = (e.sortField as string | undefined) ?? current.sortField;
  const sortDir: 'ASC' | 'DESC' = e.sortOrder === -1 ? 'DESC' : e.sortOrder === 1 ? 'ASC' : current.sortDir;
  return { page, size, sortField, sortDir };
}

/**
 * Componente genérico que resuelve CUALQUIER reporte del catálogo a partir de un
 * `ReportDef`: header, filtros, tabla paginada server-side (lazy) y export. Los 17
 * reportes son configuración (`catalog/*.reports.ts`), no 17 páginas distintas.
 *
 * Puramente presentacional — no conoce NgRx. El contenedor (`report.page.ts`)
 * lee el store y traduce `(queryPatch)`/`(exportFormat)` a acciones.
 */
@Component({
  selector: 'rpt-report-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent, PanelCardComponent, EmptyStateComponent,
    DataTableComponent, ReportFiltersComponent, ReportExportButtonsComponent,
  ],
  template: `
    <div class="rpt-viewer">
      <ui-page-header [heading]="def().title" [subtitle]="def().description" />

      <ui-panel-card>
        <rpt-report-filters
          [def]="def()"
          [branchOptions]="branchOptions()"
          (filtersChange)="onFiltersChange($event)" />
      </ui-panel-card>

      <ui-panel-card>
        <div class="rpt-viewer__toolbar">
          <rpt-export-buttons [exporting]="exporting()" (exportFormat)="onExport($event)" />
        </div>

        @if (error(); as err) {
          <ui-empty-state
            icon="pi-exclamation-triangle"
            heading="No se pudo cargar el reporte"
            [description]="err"
            [ctaLabel]="canRetry() ? 'Reintentar' : null"
            (ctaClick)="retry.emit()" />
        } @else {
          <ui-table
            [value]="content()"
            [columns]="def().columns"
            [loading]="loading()"
            [lazy]="true"
            [paginator]="true"
            [rows]="query().size"
            [rowsPerPageOptions]="[10, 20, 50, 100]"
            [totalRecords]="totalElements()"
            [first]="query().page * query().size"
            [sortField]="query().sortField"
            [sortOrder]="query().sortDir === 'DESC' ? -1 : 1"
            emptyHeading="Sin resultados"
            emptyIcon="pi-inbox"
            emptyDescription="No hay datos para los filtros elegidos."
            (lazyLoad)="onLazyLoad($event)">
          </ui-table>
        }
      </ui-panel-card>
    </div>
  `,
  styles: [`
    .rpt-viewer { display: flex; flex-direction: column; gap: var(--space-4); }
    .rpt-viewer__toolbar { display: flex; justify-content: flex-end; margin-bottom: var(--space-3); }
  `],
})
export class ReportViewerComponent {
  readonly def = input.required<ReportDef>();
  readonly query = input.required<ReportQuery>();
  readonly content = input<readonly unknown[]>([]);
  readonly totalElements = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly exporting = input<boolean>(false);
  readonly error = input<string | null>(null);
  /** HTTP status del error de carga (ej. 403) — oculta "Reintentar" cuando es un problema de permisos. */
  readonly errorStatus = input<number | null>(null);
  readonly branchOptions = input<readonly ReportBranchOption[]>([]);

  /** Un 403 no se arregla reintentando — solo se muestra el CTA para errores transitorios. */
  protected readonly canRetry = computed(() => this.errorStatus() !== 403);

  /** Patch de query a aplicar (paginación/orden desde la tabla, o filtros con page:0). */
  readonly queryPatch = output<Partial<ReportQuery>>();
  readonly exportFormat = output<ExportFormat>();
  readonly retry = output<void>();

  onLazyLoad(e: TableLazyLoadEvent): void {
    this.queryPatch.emit(resolveLazyLoadPatch(e, this.query()));
  }

  /** Cambiar cualquier filtro resetea a la página 0 — un filtro nuevo invalida la paginación previa. */
  onFiltersChange(filters: Record<string, unknown>): void {
    this.queryPatch.emit({ page: 0, filters });
  }

  onExport(format: ExportFormat): void {
    this.exportFormat.emit(format);
  }
}
