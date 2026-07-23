import { createAction, props } from '@ngrx/store';
import { ExportFormat, ReportPageResponse, ReportQuery } from '../models/report.model';

/** Entra a un reporte (navegación a /reporteria/:reportId): resetea el estado y carga la 1ra página. */
export const enterReport = createAction('[Reporteria] Enter Report', props<{ reportId: string }>());
/** Sale del reporte actual (destroy del componente): limpia el estado para no filtrar datos entre reportes. */
export const leaveReport = createAction('[Reporteria] Leave Report');

/** Patch parcial de query (paginación, orden o filtros) — dispara recarga vía efecto. */
export const setReportQuery = createAction('[Reporteria] Set Query', props<{ patch: Partial<ReportQuery> }>());

/** Reintentar con la query actual (botón "Reintentar" del estado de error). */
export const loadReportList = createAction('[Reporteria] Load List');
export const loadReportListSuccess = createAction('[Reporteria] Load List Success', props<{ page: ReportPageResponse }>());
/** `status` es el HTTP status del back cuando aplica (ej. 403) — permite decidir si mostrar "Reintentar". */
export const loadReportListFailure = createAction('[Reporteria] Load List Failure', props<{ error: string; status?: number }>());

export const exportReport = createAction('[Reporteria] Export', props<{ format: ExportFormat }>());
export const exportReportSuccess = createAction('[Reporteria] Export Success');
export const exportReportFailure = createAction('[Reporteria] Export Failure', props<{ error: string }>());
