import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { rootGuard } from '@core/guards/root.guard';
import { moduleActiveGuard } from '@core/guards/module-active.guard';
import { tenantResolver } from '@core/tenant/tenant.resolver';
import { ModuleKey } from '@core/models/module-key.enum';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    resolve: { tenant: tenantResolver },
    children: [
      // CORE — siempre presentes
      {
        path: 'empresa',
        loadChildren: () =>
          import('./features/empresa/empresa.routes').then((m) => m.EMPRESA_ROUTES),
      },
      {
        path: 'sucursales',
        loadChildren: () =>
          import('./features/sucursales/sucursales.routes').then((m) => m.SUCURSALES_ROUTES),
      },
      {
        path: 'analitica',
        loadChildren: () =>
          import('./features/analitica/analitica.routes').then((m) => m.ANALITICA_ROUTES),
      },
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./features/pacientes/pacientes.routes').then((m) => m.PACIENTES_ROUTES),
      },

      // ACTIVABLES — requieren módulo habilitado para el tenant
      {
        path: 'portal',
        canMatch: [moduleActiveGuard(ModuleKey.Portal)],
        loadChildren: () =>
          import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES),
      },
      {
        path: 'turnos',
        canMatch: [moduleActiveGuard(ModuleKey.Turnos)],
        loadChildren: () =>
          import('./features/turnos/turnos.routes').then((m) => m.TURNOS_ROUTES),
      },
      {
        path: 'financiero',
        canMatch: [moduleActiveGuard(ModuleKey.Financiero)],
        loadChildren: () =>
          import('./features/financiero/financiero.routes').then((m) => m.FINANCIERO_ROUTES),
      },
      {
        path: 'medicos',
        canMatch: [moduleActiveGuard(ModuleKey.Medicos)],
        loadChildren: () =>
          import('./features/medicos/medicos.routes').then((m) => m.MEDICOS_ROUTES),
      },
      {
        path: 'stock',
        canMatch: [moduleActiveGuard(ModuleKey.Stock)],
        loadChildren: () =>
          import('./features/stock/stock.routes').then((m) => m.STOCK_ROUTES),
      },

      // NUEVAS RUTAS
      {
        path: 'home',
        loadChildren: () =>
          import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () =>
          import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'obras-sociales',
        loadChildren: () =>
          import('./features/obras-sociales/obras-sociales.routes').then((m) => m.OBRAS_SOCIALES_ROUTES),
      },

      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'admin',
    canActivate: [rootGuard],
    loadChildren: () =>
      import('./features/saas-admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: '' },
];
