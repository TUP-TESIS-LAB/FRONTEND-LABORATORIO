import { Routes } from '@angular/router';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./portal-dashboard/portal-dashboard.component').then(
        (m) => m.PortalDashboardComponent,
      ),
  },
];
