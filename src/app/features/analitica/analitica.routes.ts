import { Routes } from '@angular/router';
import { hasRoleGuard } from '@core/guards/has-role.guard';
import { sectionGuard } from '@core/guards/section.guard';

export const ANALITICA_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: '/turnos/recepcion', pathMatch: 'full' },
      {
        path: 'extraccion',
        loadComponent: () => import('./pages/extraction-queue/extraction-queue.page')
          .then(m => m.ExtractionQueuePage),
        canMatch: [hasRoleGuard(['EXTRACTOR', 'ADMINISTRADOR'])],
        title: 'Cola de extracción',
        data: { breadcrumb: 'Extracción' },
      },
      // El listado de atenciones NO tiene pantalla propia: vive embebido en la tab
      // "Atenciones" de Recepción (/turnos/recepcion). Cualquier link viejo o URL directa
      // a /analitica/atencion redirige ahí. El wizard sigue en atencion/nueva y atencion/:id.
      { path: 'atencion', pathMatch: 'full', redirectTo: '/turnos/recepcion' },
      {
        path: 'atencion/nueva',
        loadComponent: () => import('./pages/atencion/atencion-wizard/atencion-wizard.component')
          .then(m => m.AtencionWizardComponent),
        data: { breadcrumb: 'Atención' },
      },
      {
        path: 'atencion/:id',
        loadComponent: () => import('./pages/atencion/atencion-wizard/atencion-wizard.component')
          .then(m => m.AtencionWizardComponent),
        data: { breadcrumb: 'Atención' },
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
        loadComponent: () => import('./muestras/pages/transito/transito.page').then(m => m.TransitoPage),
        data: { breadcrumb: 'Tránsito' },
        title: 'Tránsito',
      },
      {
        path: 'procesamiento',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/worklist/worklist.page').then(m => m.WorklistPage),
        data: { screenKey: 'procesamiento' },
        title: 'Procesamiento',
      },
      {
        path: 'procesamiento/cargar/:protocolId',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/cargar-resultados/cargar-resultados.page').then(m => m.CargarResultadosPage),
        title: 'Cargar resultados',
      },
      {
        path: 'procesamiento/validacion/:protocolId',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/validacion/validacion.page').then(m => m.ValidacionPage),
        title: 'Validación',
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
