import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ReportViewerComponent } from '../components/report-viewer.component';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';
import { findReportById } from '../catalog';
import { ExportFormat, ReportQuery } from '../models/report.model';
import { enterReport, leaveReport, setReportQuery, exportReport } from '../store/reporteria.actions';
import {
  selectReportContent, selectReportError, selectReportExporting,
  selectReportLoading, selectReportQuery, selectReportTotalElements,
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
  imports: [ReportViewerComponent],
  template: `
    @if (def(); as reportDef) {
      <rpt-report-viewer
        [def]="reportDef"
        [query]="query()"
        [content]="content()"
        [totalElements]="totalElements()"
        [loading]="loading()"
        [exporting]="exporting()"
        [error]="error()"
        [branchOptions]="branchOptions()"
        (queryPatch)="onQueryPatch($event)"
        (exportFormat)="onExport($event)" />
    }
  `,
})
export class ReportPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);

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
  protected readonly exporting = this.store.selectSignal(selectReportExporting);

  protected readonly branchOptions = toSignal(
    this.sucursalesService.listBranchesForSelector().pipe(
      catchError(() => of([] as { id: number; name: string }[])),
    ),
    { initialValue: [] as { id: number; name: string }[] },
  );

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
}
