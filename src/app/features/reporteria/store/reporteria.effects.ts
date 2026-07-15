import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { ReportesApiService } from '../services/reportes-api.service';
import { findReportById } from '../catalog';
import { selectReportId, selectReportQuery } from './reporteria.selectors';
import {
  enterReport, setReportQuery, loadReportList, loadReportListSuccess, loadReportListFailure,
  exportReport, exportReportSuccess, exportReportFailure,
} from './reporteria.actions';

@Injectable()
export class ReporteriaEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(ReportesApiService);

  /**
   * Entrar a un reporte, cambiar página/orden o cambiar filtros: todo dispara la
   * misma recarga. `withLatestFrom` lee el reportId/query YA actualizados por el
   * reducer (que corre síncrono antes que el efecto vea la acción), así el efecto
   * nunca necesita reconstruir la query a mano — una sola fuente de verdad.
   */
  loadOnQueryChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(enterReport, setReportQuery, loadReportList),
      withLatestFrom(this.store.select(selectReportId), this.store.select(selectReportQuery)),
      switchMap(([, reportId, query]) => {
        const def = reportId ? findReportById(reportId) : undefined;
        if (!def) return of(loadReportListFailure({ error: 'El reporte solicitado no existe.' }));
        return this.api.list(def, query).pipe(
          map((page) => loadReportListSuccess({ page })),
          catchError(() => of(loadReportListFailure({ error: 'No se pudo cargar el reporte. Probá de nuevo.' }))),
        );
      }),
    ),
  );

  /** Exportar: usa la query (con filtros) vigente en el store al momento del click. */
  export$ = createEffect(() =>
    this.actions$.pipe(
      ofType(exportReport),
      withLatestFrom(this.store.select(selectReportId), this.store.select(selectReportQuery)),
      concatMap(([{ format }, reportId, query]) => {
        const def = reportId ? findReportById(reportId) : undefined;
        if (!def) return of(exportReportFailure({ error: 'El reporte solicitado no existe.' }));
        return this.api.export(def, format, query).pipe(
          map((res) => {
            this.triggerDownload(res, def.id, format);
            return exportReportSuccess();
          }),
          catchError(() => of(exportReportFailure({ error: 'No se pudo exportar el reporte. Probá de nuevo.' }))),
        );
      }),
    ),
  );

  /** Lee el nombre de archivo del Content-Disposition (o cae a un default) y descarga el blob. */
  private triggerDownload(res: HttpResponse<Blob>, reportId: string, format: string): void {
    const body = res.body;
    if (!body) throw new Error('empty body');
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const filename = this.filenameFromDisposition(disposition) ?? `${reportId}.${format}`;
    const url = URL.createObjectURL(body);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private filenameFromDisposition(disposition: string): string | null {
    const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
    if (star?.[1]) return decodeURIComponent(star[1].replace(/['"]/g, '').trim());
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain?.[1]?.trim() ?? null;
  }
}
