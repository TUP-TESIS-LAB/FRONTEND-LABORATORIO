import { Routes } from '@angular/router';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';

export const SAAS_ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/saas-login/saas-login.page').then((m) => m.SaasLoginPage),
  },
  {
    path: '',
    canActivate: [saasAdminGuard],
    loadComponent: () =>
      import('@layout/saas-shell/saas-shell.component').then((m) => m.SaasShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./pages/tenants-list/tenants-list.page').then((m) => m.TenantsListPage),
      },
      {
        path: 'tenants/:id',
        loadComponent: () =>
          import('./pages/tenant-detail/tenant-detail.page').then((m) => m.TenantDetailPage),
      },
    ],
  },
];
