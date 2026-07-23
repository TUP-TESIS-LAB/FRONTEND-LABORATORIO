import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { PanelCardComponent } from '@shared/ui/components/panel-card/panel-card.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { DateEsPipe } from '@shared/pipes/date-es.pipe';
import { kpiDeltaMeta, KpiDeltaMeta } from '@shared/metrics/util/metric-kpi.util';
import { ExportFormat, ReportColumn, ReportDef, ReportFilterOption, ReportQuery } from '../models/report.model';
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
 * `ReportDef`: header, filtros, tabla paginada server-side (lazy) y export. Los 12
 * reportes son configuración (`catalog/*.reports.ts`), no 12 páginas distintas.
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
    DataTableComponent, UiCellDirective, TagModule, DateEsPipe,
    ReportFiltersComponent, ReportExportButtonsComponent,
  ],
  template: `
    <div class="rpt-viewer">
      <ui-page-header [heading]="def().title" [subtitle]="def().description" />

      <ui-panel-card>
        <rpt-report-filters
          [def]="def()"
          [branchOptions]="branchOptions()"
          [dynamicOptions]="dynamicOptions()"
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
            [columns]="effectiveColumns()"
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

            <!--
              Un template uiCell por columna (booleanos/fechas/variación tipados, resto
              texto/número plano) — genérico y config-driven: la columna declara su tipo
              en el catálogo, este componente elige el template. Nada hardcodeado por
              reporte (D6/D3 del spec).
            -->
            @for (col of effectiveColumns(); track col.field) {
              <ng-template [uiCell]="col.field" let-row>
                @switch (col.type) {
                  @case ('boolean') {
                    @if (isEmpty($any(row)[col.field])) {
                      <span class="text-surface-400">—</span>
                    } @else {
                      <p-tag [value]="boolLabel($any(row)[col.field])" [severity]="boolSeverity($any(row)[col.field])" />
                    }
                  }
                  @case ('date') {
                    @if ($any(row)[col.field]) {
                      {{ $any(row)[col.field] | dateEs }}
                    } @else {
                      <span class="text-surface-400">—</span>
                    }
                  }
                  @case ('variation') {
                    @if (variationMeta($any(row)[col.field]); as vm) {
                      <span class="rpt-variation" [style.color]="vm.cssVar">
                        <i [class]="vm.icon"></i> {{ vm.label }}
                      </span>
                    } @else {
                      <span class="text-surface-400">—</span>
                    }
                  }
                  @default {
                    @if (isEmpty($any(row)[col.field])) {
                      <span class="text-surface-400">—</span>
                    } @else {
                      {{ $any(row)[col.field] }}
                    }
                  }
                }
              </ng-template>
            }
          </ui-table>

          @if (totalsRow(); as trow) {
            <div class="rpt-viewer__totals">
              <span class="rpt-viewer__totals-label">Totales</span>
              @for (t of trow; track t.field) {
                <span class="rpt-viewer__totals-item"><strong>{{ t.header }}:</strong> {{ t.value }}</span>
              }
            </div>
          }
        }
      </ui-panel-card>
    </div>
  `,
  styles: [`
    .rpt-viewer { display: flex; flex-direction: column; gap: var(--space-4); }
    .rpt-viewer__toolbar { display: flex; justify-content: flex-end; margin-bottom: var(--space-3); }
    .rpt-viewer__totals {
      display: flex; flex-wrap: wrap; gap: var(--space-4);
      margin-top: var(--space-3); padding-top: var(--space-3);
      border-top: 1px solid var(--ds-border, #e8edf3);
      font-size: 13px; color: var(--ds-text);
    }
    .rpt-viewer__totals-label {
      font-weight: 700; text-transform: uppercase; font-size: 11px;
      letter-spacing: .04em; color: var(--ds-text-muted);
    }
    .rpt-variation { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
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
  /** Ver `ReportFiltersComponent.dynamicOptions` — opciones de select resueltas en runtime. */
  readonly dynamicOptions = input<Record<string, readonly ReportFilterOption[]>>({});
  /** Suma de la métrica por columna (D5) — `null` cuando el reporte no la calcula. */
  readonly totals = input<Record<string, unknown> | null>(null);

  /** Un 403 no se arregla reintentando — solo se muestra el CTA para errores transitorios. */
  protected readonly canRetry = computed(() => this.errorStatus() !== 403);

  /**
   * `def().columns` + una columna de variación sintetizada por cada entrada de
   * `def().variation` (D3/D4) — algunos reportes serie temporal traen más de una
   * métrica por fila (ej. altas Y bajas), así que no alcanza con una sola columna.
   * Vive acá y no en `columns` estático porque el nombre del campo lo define el backend.
   */
  protected readonly effectiveColumns = computed<ReportColumn[]>(() => {
    const variations = this.def().variation ?? [];
    if (!variations.length) return [...this.def().columns];
    return [
      ...this.def().columns,
      ...variations.map((v): ReportColumn => (
        { field: v.field, header: v.header ?? 'Variación', align: 'right', type: 'variation' }
      )),
    ];
  });

  /** Fila de totales lista para renderizar, o `null` si el backend no la mandó (D5). */
  protected readonly totalsRow = computed<{ field: string; header: string; value: string }[] | null>(() => {
    const totals = this.totals();
    if (!totals) return null;
    const rows = this.def().columns
      .filter((c) => Object.prototype.hasOwnProperty.call(totals, c.field))
      .map((c) => ({ field: c.field, header: c.header, value: this.formatTotalValue(totals[c.field]) }));
    return rows.length ? rows : null;
  });

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

  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  protected boolLabel(value: unknown): string {
    return value ? 'Sí' : 'No';
  }

  protected boolSeverity(value: unknown): 'success' | 'warn' {
    return value ? 'success' : 'warn';
  }

  /**
   * Icono/color (reusa `kpiDeltaMeta`, el mismo cálculo que `ui-stat-card` en los
   * dashboards) + etiqueta con signo para la columna de variación. `null` cuando el
   * valor no es un número — el backend manda `null` sin bucket previo (D4).
   */
  protected variationMeta(pct: unknown): (KpiDeltaMeta & { label: string }) | null {
    if (typeof pct !== 'number') return null;
    const meta = kpiDeltaMeta({ previousValue: null, changePct: pct });
    if (!meta) return null;
    const sign = pct > 0 ? '+' : '';
    return { ...meta, label: `${sign}${pct}%` };
  }

  private formatTotalValue(value: unknown): string {
    if (typeof value === 'number') return value.toLocaleString('es-AR');
    return this.isEmpty(value) ? '—' : String(value);
  }
}
