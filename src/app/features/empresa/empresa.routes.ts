import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-dashboard/empresa-dashboard.component').then(m => m.EmpresaDashboardComponent),
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage) },
      { path: 'roles',       loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage) },
      { path: 'white-label', loadComponent: () => import('./pages/white-label/white-label.page').then(m => m.WhiteLabelPage) },
      { path: 'modulos',     loadComponent: () => import('./pages/modulos/modulos.page').then(m => m.ModulosPage) },
      { path: 'fiscal',      loadComponent: () => import('./pages/fiscal/fiscal.page').then(m => m.FiscalPage) },
      { path: 'email',       loadComponent: () => import('./pages/email/email.page').then(m => m.EmailPage) },
    ],
  },
];
