import { Rol } from './rol.model';

export interface Usuario {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string | null;
  document: string;
  isEmailVerified: boolean;
  isExternal: boolean;
  branch: number | null;
  isFirstLogin: boolean;
  active: boolean;
  roles: Rol[];
}

export interface CrearUsuarioPayload {
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  username: string;
  roleIds: number[];
}

export type ActualizarUsuarioPayload = CrearUsuarioPayload;

export interface BuscarUsuariosParams {
  search?: string;
  isActive?: boolean;
  roleIds?: number[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface CrearUsuarioRespuesta {
  user: Usuario;
  firstLoginToken: string | null;
}

export interface CambiarEstadoPayload {
  isActive: boolean;
  reason: string;
}
