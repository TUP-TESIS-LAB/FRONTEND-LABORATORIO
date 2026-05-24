import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

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
      { path: 'areas', loadComponent: () => import('./pages/areas/areas.component').then(m => m.AreasComponent) },
      {
        path: 'configuracion',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/configuracion/sucursales-configuracion.component')
            .then(m => m.SucursalesConfiguracionComponent),
        providers: [
          provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
          provideEffects([SucursalEffects]),
        ],
      },
    ],
  },
];
