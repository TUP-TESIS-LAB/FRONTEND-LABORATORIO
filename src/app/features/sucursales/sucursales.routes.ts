import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { ConfirmationService, MessageService } from 'primeng/api';

import { roleGuard } from '@core/guards/role.guard';
import { sucursalReducer } from './store/sucursal.reducer';
import { SucursalEffects } from './store/sucursal.effects';
import { SUCURSAL_FEATURE_KEY } from './store/sucursal.state';
import { EMPLOYEE_FEATURE_KEY } from './store/employee.state';
import { employeeReducer } from './store/employee.reducer';
import { EmployeeEffects } from './store/employee.effects';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(EMPLOYEE_FEATURE_KEY, employeeReducer),
      provideEffects(EmployeeEffects),
    ],
    children: [
      {
        path: 'empleados/nuevo',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },
      {
        path: 'empleados/:id/editar',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },
      {
        path: 'lista',
        loadComponent: () => import('./pages/sucursales/sucursales.component').then((m) => m.SucursalesPageComponent),
      },
      {
        path: 'areas',
        loadComponent: () => import('./pages/areas/areas.component').then((m) => m.AreasComponent),
      },
      {
        path: '',
        loadComponent: () =>
          import('./sucursales-shell/sucursales-shell.component').then((m) => m.SucursalesShellComponent),
        children: [
          { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
          {
            path: 'configuracion',
            canMatch: [roleGuard('ADMINISTRADOR')],
            loadComponent: () =>
              import('./pages/configuracion/sucursales-configuracion.component')
                .then((m) => m.SucursalesConfiguracionComponent),
            providers: [
              provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
              provideEffects([SucursalEffects]),
              MessageService,
              ConfirmationService,
            ],
          },
          {
            path: 'empleados',
            canMatch: [roleGuard('ADMINISTRADOR')],
            loadComponent: () =>
              import('./pages/empleados-list/empleados-list.page').then((m) => m.EmpleadosListPage),
          },
        ],
      },
    ],
  },
];
