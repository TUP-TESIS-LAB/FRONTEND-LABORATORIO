import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { Usuario, Rol } from '../models/empresa.model';

// Load Usuarios
export const loadUsuarios = createAction('[Empresa Page] Load Usuarios');

export const loadUsuariosSuccess = createAction(
  '[Empresa API] Load Usuarios Success',
  props<{ usuarios: Usuario[] }>()
);

export const loadUsuariosFailure = createAction(
  '[Empresa API] Load Usuarios Failure',
  props<{ error: HttpErrorResponse }>()
);

// Load Roles
export const loadRoles = createAction('[Empresa Page] Load Roles');

export const loadRolesSuccess = createAction(
  '[Empresa API] Load Roles Success',
  props<{ roles: Rol[] }>()
);

export const loadRolesFailure = createAction(
  '[Empresa API] Load Roles Failure',
  props<{ error: HttpErrorResponse }>()
);
