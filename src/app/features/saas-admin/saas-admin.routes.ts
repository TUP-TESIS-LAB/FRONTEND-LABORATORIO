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
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'tenants',
        data: { breadcrumb: 'Tenants' },
        loadComponent: () =>
          import('./pages/tenants-list/tenants-list.page').then((m) => m.TenantsListPage),
      },
      {
        path: 'tenants/nuevo',
        data: { breadcrumb: 'Nuevo tenant' },
        loadComponent: () =>
          import('./pages/tenant-wizard/tenant-wizard.page').then((m) => m.TenantWizardPage),
      },
      {
        path: 'tenants/:id',
        data: { breadcrumb: 'Detalle' },
        loadComponent: () =>
          import('./pages/tenant-detail/tenant-detail.page').then((m) => m.TenantDetailPage),
      },
    ],
  },
];
