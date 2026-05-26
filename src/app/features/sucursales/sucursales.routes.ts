import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { ConfirmationService, MessageService } from 'primeng/api';

import { roleGuard } from '@core/guards/role.guard';
import { sucursalReducer } from './store/sucursal.reducer';
import { SucursalEffects } from './store/sucursal.effects';
import { SUCURSAL_FEATURE_KEY } from './store/sucursal.state';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      { path: 'lista', loadComponent: () => import('./pages/sucursales/sucursales.component').then(m => m.SucursalesPageComponent) },
      {
        path: 'configuracion',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/configuracion/sucursales-configuracion.component')
            .then(m => m.SucursalesConfiguracionComponent),
        providers: [
          provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
          provideEffects([SucursalEffects]),
          MessageService,
          ConfirmationService,
        ],
      },
      {
        path: 'catalogo',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/catalogo/sucursales-catalogo.page')
            .then(m => m.SucursalesCatalogoPage),
        providers: [
          provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
          provideEffects([SucursalEffects]),
          MessageService,
          ConfirmationService,
        ],
      },
      {
        path: 'configuracion/nueva',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page')
            .then(m => m.SucursalAltaStepperPage),
        providers: [
          provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
          provideEffects([SucursalEffects]),
          MessageService,
        ],
      },
      {
        path: 'configuracion/:id',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/configuracion/sucursal-detalle/sucursal-detalle.page')
            .then(m => m.SucursalDetallePage),
        providers: [
          provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
          provideEffects([SucursalEffects]),
          MessageService,
          ConfirmationService,
        ],
      },
    ],
  },
];
