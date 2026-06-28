import { HttpErrorResponse } from '@angular/common/http';
import { Usuario, BuscarUsuariosParams } from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { WhiteLabel } from '../models/white-label.model';
import { ModuloTenant } from '../models/modulo.model';
import { SmtpConfig, TestEmailResult } from '../models/smtp-config.model';
import { AuthorizerCandidate, ReportTemplate } from '../models/report-template.model';

export interface EmpresaState {
  // Usuarios
  usuarios: Usuario[];
  usuariosPage: number;
  usuariosSize: number;
  usuariosTotalElements: number;
  usuariosTotalPages: number;
  usuariosFilters: BuscarUsuariosParams;
  usuarioSelected: Usuario | null;

  // Roles
  roles: Rol[];

  // White label
  whiteLabel: WhiteLabel | null;

  // Modulos
  modulos: ModuloTenant[];

  // Report template (config informe PDF)
  reportTemplate: ReportTemplate | null;
  // Candidatos a firmante autorizante del informe (admins del tenant).
  authorizerCandidates: AuthorizerCandidate[];

  // SMTP / Email
  smtpConfig: SmtpConfig | null;
  smtpPending: boolean;
  smtpTesting: boolean;
  smtpTestResult: TestEmailResult | null;
  smtpTestError: string | null;

  // Link de primer login a mostrar tras crear/regenerar (no se manda email aún).
  // El componente lo lee, arma el link y lo ofrece para copiar; null = sin dialog.
  lastFirstLoginToken: string | null;

  // Compartidos
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialEmpresaState: EmpresaState = {
  usuarios: [],
  usuariosPage: 0,
  usuariosSize: 20,
  usuariosTotalElements: 0,
  usuariosTotalPages: 0,
  usuariosFilters: { page: 0, size: 20, isActive: undefined },
  usuarioSelected: null,

  roles: [],
  whiteLabel: null,
  modulos: [],
  reportTemplate: null,
  authorizerCandidates: [],

  smtpConfig: null,
  smtpPending: false,
  smtpTesting: false,
  smtpTestResult: null,
  smtpTestError: null,

  lastFirstLoginToken: null,

  pending: false,
  error: null,
};

export const EMPRESA_FEATURE_KEY = 'empresa';
