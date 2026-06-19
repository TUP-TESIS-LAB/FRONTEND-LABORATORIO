import { Routes } from '@angular/router';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';

export const FINANCIERO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./financiero-shell/financiero-shell.component').then(
        (m) => m.FinancieroShellComponent,
      ),
    children: [
      { path: '', redirectTo: 'caja', pathMatch: 'full' },
      {
        path: 'caja',
        loadComponent: () =>
          import('./pages/caja/caja.page').then((m) => m.CajaPage),
      },
      {
        path: 'cobros',
        loadComponent: () =>
          import('./pages/cobros/cobros.page').then((m) => m.CobrosPage),
      },
      {
        path: 'cobros/:id',
        loadComponent: () =>
          import('./pages/cobros/cobro-detalle.page').then(
            (m) => m.CobroDetallePage,
          ),
      },
      {
        path: 'config-fiscal',
        canActivate: [saasAdminGuard],
        loadComponent: () =>
          import('./pages/config-fiscal/config-fiscal.page').then(
            (m) => m.ConfigFiscalPage,
          ),
      },
      {
        path: 'coberturas',
        loadComponent: () =>
          import('./pages/placeholder/modulo-no-disponible.component').then(
            (m) => m.ModuloNoDisponibleComponent,
          ),
        data: { kind: 'coberturas' },
      },
      {
        path: 'liquidaciones',
        loadComponent: () =>
          import('./pages/placeholder/modulo-no-disponible.component').then(
            (m) => m.ModuloNoDisponibleComponent,
          ),
        data: { kind: 'liquidaciones' },
      },
    ],
  },
];
