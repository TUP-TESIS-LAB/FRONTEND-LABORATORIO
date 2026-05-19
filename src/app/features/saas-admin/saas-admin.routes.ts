import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS login placeholder (Task 6)</p>`,
})
class SaasLoginPlaceholder {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Dashboard placeholder (Task 14)</p>`,
})
class SaasDashboardPlaceholder {}

export const SAAS_ADMIN_ROUTES: Routes = [
  { path: 'login', component: SaasLoginPlaceholder },
  {
    path: '',
    canActivate: [saasAdminGuard],
    loadComponent: () =>
      import('@layout/saas-shell/saas-shell.component').then((m) => m.SaasShellComponent),
    children: [
      { path: '', component: SaasDashboardPlaceholder },
    ],
  },
];
