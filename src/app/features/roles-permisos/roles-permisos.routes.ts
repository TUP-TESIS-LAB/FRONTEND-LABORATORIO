import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

export const ROLES_PERMISOS_ROUTES: Routes = [
  {
    path: '',
    canMatch: [roleGuard('ADMINISTRADOR')],
    loadComponent: () =>
      import('./pages/roles-permisos.page').then((m) => m.RolesPermisosPage),
  },
];
