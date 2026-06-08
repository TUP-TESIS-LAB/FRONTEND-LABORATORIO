import { Routes } from '@angular/router';
import { hasRoleGuard } from '@core/guards/has-role.guard';
import { sectionGuard } from '@core/guards/section.guard';

export const ANALITICA_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'atencion', pathMatch: 'full' },
      {
        path: 'extraccion',
        loadComponent: () => import('./pages/extraction-queue/extraction-queue.page')
          .then(m => m.ExtractionQueuePage),
        canMatch: [hasRoleGuard(['EXTRACTOR', 'ADMINISTRADOR'])],
        title: 'Cola de extracción',
      },
      {
        path: 'atencion',
        canMatch: [sectionGuard('ATENCION')],
        loadComponent: () => import('./pages/atencion/atencion-dashboard/atencion-dashboard.component')
          .then(m => m.AtencionDashboardComponent),
      },
      {
        path: 'atencion/nueva',
        loadComponent: () => import('./pages/atencion/atencion-wizard/atencion-wizard.component')
          .then(m => m.AtencionWizardComponent),
      },
      {
        path: 'atencion/:id',
        loadComponent: () => import('./pages/atencion/atencion-wizard/atencion-wizard.component')
          .then(m => m.AtencionWizardComponent),
      },
      { path: 'protocolos', loadComponent: () => import('./pages/protocolos/protocolos.component').then(m => m.ProtocolosComponent) },
      { path: 'rotulos',    loadComponent: () => import('./pages/rotulos/rotulos.component').then(m => m.RotulosComponent) },
      {
        path: 'recoleccion',
        canMatch: [sectionGuard('PREANALITICA')],
        loadComponent: () => import('./muestras/pages/worklist/worklist.page').then(m => m.WorklistPage),
        data: { screenKey: 'recoleccion' },
        title: 'Recolección',
      },
      {
        path: 'traslado',
        canMatch: [sectionGuard('PREANALITICA')],
        loadComponent: () => import('./muestras/pages/worklist/worklist.page').then(m => m.WorklistPage),
        data: { screenKey: 'traslado' },
        title: 'Traslado',
      },
      {
        path: 'procesamiento',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/worklist/worklist.page').then(m => m.WorklistPage),
        data: { screenKey: 'procesamiento' },
        title: 'Procesamiento',
      },
      {
        path: 'descarte',
        canMatch: [sectionGuard('POSTANALITICA')],
        loadComponent: () => import('./muestras/pages/worklist/worklist.page').then(m => m.WorklistPage),
        data: { screenKey: 'descarte' },
        title: 'Descarte',
      },
      { path: 'nbu', loadComponent: () => import('./pages/nbu/nbu.component').then(m => m.NbuComponent) },
    ],
  },
];
