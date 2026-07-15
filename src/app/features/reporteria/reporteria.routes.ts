import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { hasRoleGuard } from '@core/guards/has-role.guard';
import { REPORTERIA_FEATURE_KEY } from './store/reporteria.state';
import { reporteriaReducer } from './store/reporteria.reducer';
import { ReporteriaEffects } from './store/reporteria.effects';

// Unión de todos los roles que tienen al menos un reporte en el catálogo (ver
// ReportDef.roles en cada catalog/*.reports.ts). Es solo el gate de la SECCIÓN;
// el gate fino por reporte lo hace ReporteriaHomePage al listar (y el backend,
// que es la autoridad real vía @PreAuthorize).
const REPORTERIA_ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];

export const REPORTERIA_ROUTES: Routes = [
  {
    path: '',
    canMatch: [hasRoleGuard(REPORTERIA_ROLES)],
    providers: [
      provideState(REPORTERIA_FEATURE_KEY, reporteriaReducer),
      provideEffects(ReporteriaEffects),
    ],
    children: [
      {
        path: '',
        data: { breadcrumb: 'Reportes' },
        loadComponent: () =>
          import('./pages/reporteria-home.page').then((m) => m.ReporteriaHomePage),
      },
      {
        path: ':reportId',
        data: { breadcrumb: 'Reporte' },
        loadComponent: () =>
          import('./pages/report.page').then((m) => m.ReportPage),
      },
    ],
  },
];
