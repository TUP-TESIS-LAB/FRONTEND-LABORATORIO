import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';
import { ReportViewerComponent } from '../components/report-viewer.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import { findReportById } from '../catalog';
import { ExportFormat, ReportFilterOption, ReportQuery } from '../models/report.model';
import { enterReport, leaveReport, setReportQuery, exportReport, loadReportList } from '../store/reporteria.actions';
import {
  selectReportContent, selectReportError, selectReportErrorStatus, selectReportExporting,
  selectReportLoading, selectReportQuery, selectReportTotalElements, selectReportTotals,
} from '../store/reporteria.selectors';

/**
 * Página genérica que resuelve el reporte por `:reportId`. No tiene lógica de
 * negocio propia: busca el `ReportDef` en el catálogo, conecta el store y
 * delega toda la UI a `ReportViewerComponent`.
 */
@Component({
  selector: 'rpt-report-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReportViewerComponent, EmptyStateComponent, ToastModule],
  template: `
    <p-toast />
    @if (def(); as reportDef) {
      <rpt-report-viewer
        [def]="reportDef"
        [query]="query()"
        [content]="content()"
        [totalElements]="totalElements()"
        [loading]="loading()"
        [exporting]="exporting()"
        [error]="error()"
        [errorStatus]="errorStatus()"
        [branchOptions]="effectiveBranchOptions()"
        [dynamicOptions]="dynamicOptions()"
        [totals]="totals()"
        (queryPatch)="onQueryPatch($event)"
        (exportFormat)="onExport($event)"
        (retry)="onRetry()" />
    } @else {
      <ui-empty-state
        icon="pi-exclamation-triangle"
        heading="Reporte no encontrado"
        description="El reporte solicitado no existe." />
    }
  `,
})
export class ReportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly obraSocialService = inject(ObraSocialService);

  private readonly reportId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('reportId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('reportId') ?? '' },
  );

  protected readonly def = computed(() => findReportById(this.reportId()));

  protected readonly query = this.store.selectSignal(selectReportQuery);
  protected readonly content = this.store.selectSignal(selectReportContent);
  protected readonly totalElements = this.store.selectSignal(selectReportTotalElements);
  protected readonly loading = this.store.selectSignal(selectReportLoading);
  protected readonly error = this.store.selectSignal(selectReportError);
  protected readonly errorStatus = this.store.selectSignal(selectReportErrorStatus);
  protected readonly exporting = this.store.selectSignal(selectReportExporting);
  protected readonly totals = this.store.selectSignal(selectReportTotals);

  protected readonly branchOptions = toSignal(
    this.sucursalesService.listBranchesForSelector().pipe(
      catchError(() => of([] as { id: number; name: string }[])),
    ),
    { initialValue: [] as { id: number; name: string }[] },
  );

  /**
   * Opt-in (D2.1): el selector de sucursal solo aparece donde el backend acepta `branchId`.
   * Sin el flag no se muestra — un selector que el backend ignora le hace creer al usuario
   * que filtró cuando no filtró nada.
   */
  protected readonly effectiveBranchOptions = computed(() =>
    this.def()?.branchFilterable === true ? this.branchOptions() : [],
  );

  protected readonly planOptions = toSignal(
    this.obraSocialService.listPlansForSelector().pipe(
      catchError(() => of([] as { id: number; name: string }[])),
    ),
    { initialValue: [] as { id: number; name: string }[] },
  );

  /**
   * Opciones dinámicas por `dynamicOptionsKey` (ver `ReportFilterDef`/T5). El filtro
   * "plan" de R-PAC-04 se arma acá con `GET /coverages/plans` (mismo patrón que
   * `branchOptions`). Si viene vacío, `ReportFiltersComponent.hasResolvedOptions`
   * esconde el filtro en vez de mostrar un select sin opciones.
   */
  protected readonly dynamicOptions = computed<Record<string, readonly ReportFilterOption[]>>(() => ({
    planes: this.planOptions().map((p) => ({ value: p.id, label: p.name })),
  }));

  constructor() {
    // effect (no ngOnInit): si el usuario navega de un reporte a otro sin salir
    // de /reporteria/:reportId, Angular reusa esta instancia de componente — solo
    // cambia el paramMap, así que hace falta reaccionar al signal, no a init.
    effect(() => {
      const id = this.reportId();
      if (id) this.store.dispatch(enterReport({ reportId: id }));
    });
    this.destroyRef.onDestroy(() => this.store.dispatch(leaveReport()));
  }

  onQueryPatch(patch: Partial<ReportQuery>): void {
    this.store.dispatch(setReportQuery({ patch }));
  }

  onExport(format: ExportFormat): void {
    this.store.dispatch(exportReport({ format }));
  }

  onRetry(): void {
    this.store.dispatch(loadReportList());
  }
}
