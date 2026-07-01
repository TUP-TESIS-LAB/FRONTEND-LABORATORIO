import { Routes } from '@angular/router';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';
import { hasRoleGuard } from '@core/guards/has-role.guard';

export const FINANCIERO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./financiero-shell/financiero-shell.component').then(
        (m) => m.FinancieroShellComponent,
      ),
    data: { breadcrumb: 'Financiero' },
    children: [
      { path: '', redirectTo: 'caja', pathMatch: 'full' },
      {
        path: 'caja',
        data: { breadcrumb: 'Caja' },
        loadComponent: () =>
          import('./pages/caja/caja.page').then((m) => m.CajaPage),
      },
      {
        path: 'cobros',
        data: { breadcrumb: 'Cobros' },
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
        path: 'cobrar/:attentionId',
        loadComponent: () =>
          import('./components/cobro-atencion/cobro-atencion.component').then(
            (m) => m.CobroAtencionComponent,
          ),
      },
      {
        path: 'sucursales',
        data: { breadcrumb: 'Sucursales' },
        loadComponent: () =>
          import('./pages/sucursales/sucursales-resumen.page').then(
            (m) => m.SucursalesResumenPage,
          ),
      },
      {
        path: 'subcajas',
        canMatch: [hasRoleGuard(['ADMINISTRADOR'])],
        data: { breadcrumb: 'Cajas' },
        loadComponent: () =>
          import('./pages/subcajas/subcajas.page').then((m) => m.SubcajasPage),
      },
      {
        path: 'cuentas-destino',
        canMatch: [hasRoleGuard(['ADMINISTRADOR'])],
        data: { breadcrumb: 'Cuentas destino' },
        loadComponent: () =>
          import('./pages/cuentas-destino/cuentas-destino.page').then(
            (m) => m.CuentasDestinoPage,
          ),
      },
      {
        path: 'config-fiscal',
        canActivate: [saasAdminGuard],
        data: { breadcrumb: 'Config fiscal' },
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
