import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { rootGuard } from '@core/guards/root.guard';
import { moduleActiveGuard } from '@core/guards/module-active.guard';
import { sectionGuard } from '@core/guards/section.guard';
import { guestGuard } from '@core/guards/guest.guard';
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
        canMatch: [sectionGuard('SUCURSALES')],
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
        canMatch: [sectionGuard('PACIENTES')],
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
        canMatch: [moduleActiveGuard(ModuleKey.Turnos), sectionGuard('TURNOS')],
        loadChildren: () =>
          import('./features/turnos/turnos.routes').then((m) => m.TURNOS_ROUTES),
      },
      {
        path: 'financiero',
        canMatch: [moduleActiveGuard(ModuleKey.Financiero), sectionGuard('FINANCIERO')],
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
          import('./features/roles-permisos/roles-permisos.routes').then((m) => m.ROLES_PERMISOS_ROUTES),
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
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'first-login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/first-login/first-login.component').then(
        (m) => m.FirstLoginComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  {
    path: 'saas',
    loadChildren: () =>
      import('./features/saas-admin/saas-admin.routes').then((m) => m.SAAS_ADMIN_ROUTES),
  },

  {
    path: 'display/:tenantSlug/:branchId',
    loadComponent: () =>
      import('./features/turnos/pages/sala-espera/sala-espera.page').then((m) => m.SalaEsperaPage),
  },

  {
    path: 'turnos/totem',
    loadComponent: () =>
      import('./layout/kiosk-shell/kiosk-shell.component').then((m) => m.KioskShellComponent),
    loadChildren: () =>
      import('./features/turnos/pages/totem/totem.routes').then((m) => m.TOTEM_ROUTES),
  },

  { path: '**', redirectTo: '' },
];
