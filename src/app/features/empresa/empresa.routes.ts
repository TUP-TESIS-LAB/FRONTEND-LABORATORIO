import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { NotifConfigEffects } from './store/notificaciones-config/notificaciones-config.effects';
import { notifConfigReducer } from './store/notificaciones-config/notificaciones-config.reducer';
import { NOTIF_CONFIG_FEATURE_KEY } from './store/notificaciones-config/notificaciones-config.state';

import { SeccionesEffects } from './store/secciones/secciones.effects';
import { seccionesReducer } from './store/secciones/secciones.reducer';
import { SECCIONES_FEATURE_KEY } from './store/secciones/secciones.state';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Empresa' },
    loadComponent: () =>
      import('./empresa-dashboard/empresa-dashboard.component').then(m => m.EmpresaDashboardComponent),
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    data: { breadcrumb: 'Usuarios' },     loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage) },
      {
        path: 'secciones',
        data: { breadcrumb: 'Secciones' },
        loadComponent: () => import('./pages/secciones/secciones.page').then(m => m.SeccionesPage),
        providers: [
          provideState(SECCIONES_FEATURE_KEY, seccionesReducer),
          provideEffects(SeccionesEffects),
        ],
      },
      { path: 'white-label', data: { breadcrumb: 'White label' },  loadComponent: () => import('./pages/white-label/white-label.page').then(m => m.WhiteLabelPage) },
      { path: 'fiscal',      data: { breadcrumb: 'Facturación' },  loadComponent: () => import('./pages/fiscal/fiscal.page').then(m => m.FiscalPage) },
      { path: 'email',       data: { breadcrumb: 'Email' },        loadComponent: () => import('./pages/email/email.page').then(m => m.EmailPage) },
      { path: 'informe-pdf', data: { breadcrumb: 'Informe PDF' },  loadComponent: () => import('./pages/informe-pdf/informe-pdf.page').then(m => m.InformePdfPage) },
      {
        path: 'notificaciones',
        data: { breadcrumb: 'Notificaciones' },
        loadComponent: () =>
          import('./pages/notificaciones/notificaciones-config.page').then(m => m.NotificacionesConfigPage),
        providers: [
          provideState(NOTIF_CONFIG_FEATURE_KEY, notifConfigReducer),
          provideEffects(NotifConfigEffects),
        ],
      },
    ],
  },
];
