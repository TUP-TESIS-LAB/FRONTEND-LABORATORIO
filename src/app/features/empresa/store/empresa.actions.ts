import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import {
  Usuario,
  BuscarUsuariosParams,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  CrearUsuarioRespuesta,
  CambiarEstadoPayload,
} from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { PaginatedResponse } from '../models/paginated.model';
import { WhiteLabel, GuardarWhiteLabelPayload } from '../models/white-label.model';
import { ModuloTenant, ModuleCode } from '../models/modulo.model';

// =========================
// Usuarios — search/list
// =========================
export const loadUsuarios = createAction(
  '[Empresa Usuarios Page] Load Usuarios',
  props<{ filters: BuscarUsuariosParams }>(),
);
export const loadUsuariosSuccess = createAction(
  '[Empresa API] Load Usuarios Success',
  props<{ result: PaginatedResponse<Usuario> }>(),
);
export const loadUsuariosFailure = createAction(
  '[Empresa API] Load Usuarios Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setUsuariosFilters = createAction(
  '[Empresa Usuarios Page] Set Filters',
  props<{ patch: Partial<BuscarUsuariosParams> }>(),
);

// =========================
// Usuarios — detalle
// =========================
export const loadUsuario = createAction(
  '[Empresa Usuarios Page] Load Usuario',
  props<{ id: number }>(),
);
export const loadUsuarioSuccess = createAction(
  '[Empresa API] Load Usuario Success',
  props<{ usuario: Usuario }>(),
);
export const loadUsuarioFailure = createAction(
  '[Empresa API] Load Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearUsuarioSelected = createAction(
  '[Empresa Usuarios Page] Clear Selected',
);

// =========================
// Usuarios — add (submit, exhaustMap)
// =========================
export const addUsuario = createAction(
  '[Empresa Usuario Form] Add Usuario',
  props<{ payload: CrearUsuarioPayload }>(),
);
export const addUsuarioSuccess = createAction(
  '[Empresa API] Add Usuario Success',
  props<{ result: CrearUsuarioRespuesta }>(),
);
export const addUsuarioFailure = createAction(
  '[Empresa API] Add Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — update (submit, exhaustMap)
// =========================
export const updateUsuario = createAction(
  '[Empresa Usuario Form] Update Usuario',
  props<{ id: number; payload: ActualizarUsuarioPayload }>(),
);
export const updateUsuarioSuccess = createAction(
  '[Empresa API] Update Usuario Success',
  props<{ usuario: Usuario }>(),
);
export const updateUsuarioFailure = createAction(
  '[Empresa API] Update Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — toggle status (concatMap)
// =========================
export const toggleUsuarioStatus = createAction(
  '[Empresa Toggle Status Dialog] Toggle Status',
  props<{ id: number; payload: CambiarEstadoPayload }>(),
);
export const toggleUsuarioStatusSuccess = createAction(
  '[Empresa API] Toggle Status Success',
  props<{ usuario: Usuario }>(),
);
export const toggleUsuarioStatusFailure = createAction(
  '[Empresa API] Toggle Status Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — auth admin (concatMap)
// =========================
export const resendUsuarioInvite = createAction(
  '[Empresa Usuarios Page] Resend Invite',
  props<{ userId: number }>(),
);
export const resendUsuarioInviteSuccess = createAction(
  '[Empresa API] Resend Invite Success',
  props<{ userId: number }>(),
);
export const resendUsuarioInviteFailure = createAction(
  '[Empresa API] Resend Invite Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const regenerateFirstLoginToken = createAction(
  '[Empresa Usuarios Page] Regenerate First Login Token',
  props<{ userId: number }>(),
);
export const regenerateFirstLoginTokenSuccess = createAction(
  '[Empresa API] Regenerate First Login Token Success',
  props<{ userId: number; token: string }>(),
);
export const regenerateFirstLoginTokenFailure = createAction(
  '[Empresa API] Regenerate First Login Token Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Roles — load
// =========================
export const loadRoles = createAction('[Empresa Roles Page] Load Roles');
export const loadRolesSuccess = createAction(
  '[Empresa API] Load Roles Success',
  props<{ roles: Rol[] }>(),
);
export const loadRolesFailure = createAction(
  '[Empresa API] Load Roles Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// White label — load / save
// =========================
export const loadWhiteLabel = createAction('[Empresa WhiteLabel Page] Load WhiteLabel');
export const loadWhiteLabelSuccess = createAction(
  '[Empresa API] Load WhiteLabel Success',
  props<{ whiteLabel: WhiteLabel }>(),
);
export const loadWhiteLabelFailure = createAction(
  '[Empresa API] Load WhiteLabel Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const saveWhiteLabel = createAction(
  '[Empresa WhiteLabel Form] Save WhiteLabel',
  props<{ payload: GuardarWhiteLabelPayload }>(),
);
export const saveWhiteLabelSuccess = createAction(
  '[Empresa API] Save WhiteLabel Success',
  props<{ whiteLabel: WhiteLabel }>(),
);
export const saveWhiteLabelFailure = createAction(
  '[Empresa API] Save WhiteLabel Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Modulos — load / toggle
// =========================
export const loadModulos = createAction('[Empresa Modulos Page] Load Modulos');
export const loadModulosSuccess = createAction(
  '[Empresa API] Load Modulos Success',
  props<{ modulos: ModuloTenant[] }>(),
);
export const loadModulosFailure = createAction(
  '[Empresa API] Load Modulos Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const toggleModulo = createAction(
  '[Empresa Modulos Page] Toggle Modulo',
  props<{ code: ModuleCode; enable: boolean }>(),
);
export const toggleModuloSuccess = createAction(
  '[Empresa API] Toggle Modulo Success',
  props<{ code: ModuleCode; enable: boolean }>(),
);
export const toggleModuloFailure = createAction(
  '[Empresa API] Toggle Modulo Failure',
  props<{ error: HttpErrorResponse }>(),
);
