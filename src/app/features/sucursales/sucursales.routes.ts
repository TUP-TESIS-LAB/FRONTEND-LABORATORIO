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
        data: { breadcrumb: 'Nuevo empleado' },
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },
      {
        path: 'empleados/:id/editar',
        canMatch: [roleGuard('ADMINISTRADOR')],
        data: { breadcrumb: 'Editar empleado' },
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },
      {
        path: 'areas',
        data: { breadcrumb: 'Áreas' },
        loadComponent: () => import('./pages/areas/areas.component').then((m) => m.AreasComponent),
      },
      {
        path: 'catalogo',
        canMatch: [roleGuard('ADMINISTRADOR')],
        data: { breadcrumb: 'Catálogo' },
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
        data: { breadcrumb: 'Nueva sucursal' },
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
        path: 'configuracion/:id/editar',
        canMatch: [roleGuard('ADMINISTRADOR')],
        data: { breadcrumb: 'Editar sucursal' },
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
        data: { breadcrumb: 'Detalle' },
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
      {
        path: '',
        loadComponent: () =>
          import('./sucursales-shell/sucursales-shell.component').then((m) => m.SucursalesShellComponent),
        children: [
          { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
          {
            path: 'configuracion',
            canMatch: [roleGuard('ADMINISTRADOR')],
            data: { breadcrumb: 'Configuración' },
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
            data: { breadcrumb: 'Empleados' },
            loadComponent: () =>
              import('./pages/empleados-list/empleados-list.page').then((m) => m.EmpleadosListPage),
          },
        ],
      },
    ],
  },
];
