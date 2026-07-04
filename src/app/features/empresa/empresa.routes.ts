import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { NotifConfigEffects } from './store/notificaciones-config/notificaciones-config.effects';
import { notifConfigReducer } from './store/notificaciones-config/notificaciones-config.reducer';
import { NOTIF_CONFIG_FEATURE_KEY } from './store/notificaciones-config/notificaciones-config.state';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-dashboard/empresa-dashboard.component').then(m => m.EmpresaDashboardComponent),
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage) },
      { path: 'white-label', loadComponent: () => import('./pages/white-label/white-label.page').then(m => m.WhiteLabelPage) },
      { path: 'fiscal',      loadComponent: () => import('./pages/fiscal/fiscal.page').then(m => m.FiscalPage) },
      { path: 'email',       loadComponent: () => import('./pages/email/email.page').then(m => m.EmailPage) },
      {
        path: 'notificaciones',
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
