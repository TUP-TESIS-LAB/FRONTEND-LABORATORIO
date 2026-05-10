import { HttpErrorResponse } from '@angular/common/http';
import { Usuario, Rol } from '../models/empresa.model';

export interface EmpresaState {
  usuarios: Usuario[];
  roles: Rol[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialEmpresaState: EmpresaState = {
  usuarios: [],
  roles: [],
  pending: false,
  error: null,
};

export const EMPRESA_FEATURE_KEY = 'empresa';
