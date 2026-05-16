import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage) },
      { path: 'roles',       loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage) },
      { path: 'white-label', loadComponent: () => import('./pages/white-label/white-label.page').then(m => m.WhiteLabelPage) },
      { path: 'fiscal',      loadComponent: () => import('./pages/fiscal/fiscal.component').then(m => m.FiscalComponent) },
      { path: 'smtp-docs',   loadComponent: () => import('./pages/smtp-docs/smtp-docs.component').then(m => m.SmtpDocsComponent) },
      { path: 'modulos',     loadComponent: () => import('./pages/modulos/modulos.page').then(m => m.ModulosPage) },
    ],
  },
];
