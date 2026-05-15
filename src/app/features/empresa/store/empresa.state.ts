import { HttpErrorResponse } from '@angular/common/http';
import { Usuario, BuscarUsuariosParams } from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { WhiteLabel } from '../models/white-label.model';
import { ModuloTenant } from '../models/modulo.model';

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

  pending: false,
  error: null,
};

export const EMPRESA_FEATURE_KEY = 'empresa';
