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
import { SmtpConfig, GuardarSmtpConfigPayload, EnviarTestEmailPayload, TestEmailResult } from '../models/smtp-config.model';
import {
  ReportTemplate, GuardarReportTemplateTextPayload, AuthorizerCandidate,
} from '../models/report-template.model';
import { FiscalStatus } from '../models/fiscal-status.model';

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
/** Cierra el dialog del link de primer login (resetea el token mostrado). */
export const clearFirstLoginToken = createAction('[Empresa Usuarios Page] Clear First Login Token');

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

// =========================
// SMTP — load / save / test
// =========================
export const loadSmtpConfig = createAction('[Empresa Email Page] Load SmtpConfig');
export const loadSmtpConfigSuccess = createAction(
  '[Empresa API] Load SmtpConfig Success',
  props<{ config: SmtpConfig }>(),
);
export const loadSmtpConfigFailure = createAction(
  '[Empresa API] Load SmtpConfig Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const saveSmtpConfig = createAction(
  '[Empresa Email Form] Save SmtpConfig',
  props<{ payload: GuardarSmtpConfigPayload }>(),
);
export const saveSmtpConfigSuccess = createAction(
  '[Empresa API] Save SmtpConfig Success',
  props<{ config: SmtpConfig }>(),
);
export const saveSmtpConfigFailure = createAction(
  '[Empresa API] Save SmtpConfig Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const sendTestEmail = createAction(
  '[Empresa Email Page] Send Test Email',
  props<{ payload: EnviarTestEmailPayload }>(),
);
export const sendTestEmailSuccess = createAction(
  '[Empresa API] Send Test Email Success',
  props<{ result: TestEmailResult }>(),
);
export const sendTestEmailFailure = createAction(
  '[Empresa API] Send Test Email Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const clearTestEmailResult = createAction('[Empresa Email Page] Clear Test Result');

// =========================
// Report template — load / save text / upload image / delete image
// =========================
export const loadReportTemplate = createAction('[Empresa ReportTemplate Page] Load ReportTemplate');
export const loadReportTemplateSuccess = createAction(
  '[Empresa API] Load ReportTemplate Success',
  props<{ reportTemplate: ReportTemplate }>(),
);
export const loadReportTemplateFailure = createAction(
  '[Empresa API] Load ReportTemplate Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const saveReportTemplateText = createAction(
  '[Empresa ReportTemplate Form] Save ReportTemplate Text',
  props<{ payload: GuardarReportTemplateTextPayload }>(),
);
export const saveReportTemplateTextSuccess = createAction(
  '[Empresa API] Save ReportTemplate Text Success',
  props<{ reportTemplate: ReportTemplate }>(),
);
export const saveReportTemplateTextFailure = createAction(
  '[Empresa API] Save ReportTemplate Text Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const uploadReportImage = createAction(
  '[Empresa ReportTemplate Page] Upload Report Image',
  props<{ target: 'header' | 'watermark'; file: File }>(),
);
export const uploadReportImageSuccess = createAction(
  '[Empresa API] Upload Report Image Success',
);
export const uploadReportImageFailure = createAction(
  '[Empresa API] Upload Report Image Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const deleteReportImage = createAction(
  '[Empresa ReportTemplate Page] Delete Report Image',
  props<{ target: 'header' | 'watermark' }>(),
);
export const deleteReportImageSuccess = createAction(
  '[Empresa API] Delete Report Image Success',
);
export const deleteReportImageFailure = createAction(
  '[Empresa API] Delete Report Image Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Estado fiscal — load (solo lectura; se edita desde el panel de SaaS Admin)
// =========================
export const loadFiscalStatus = createAction('[Empresa Fiscal Page] Load FiscalStatus');
export const loadFiscalStatusSuccess = createAction(
  '[Empresa API] Load FiscalStatus Success',
  props<{ status: FiscalStatus }>(),
);
export const loadFiscalStatusFailure = createAction(
  '[Empresa API] Load FiscalStatus Failure',
  props<{ error: HttpErrorResponse }>(),
);

// Candidatos a firmante autorizante (admins del tenant) — read para poblar el select.
export const loadAuthorizerCandidates = createAction(
  '[Empresa ReportTemplate Page] Load Authorizer Candidates',
);
export const loadAuthorizerCandidatesSuccess = createAction(
  '[Empresa API] Load Authorizer Candidates Success',
  props<{ candidates: AuthorizerCandidate[] }>(),
);
export const loadAuthorizerCandidatesFailure = createAction(
  '[Empresa API] Load Authorizer Candidates Failure',
  props<{ error: HttpErrorResponse }>(),
);
