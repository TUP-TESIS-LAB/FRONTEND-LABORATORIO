import { Sucursal } from '../models/sucursal.model';

export interface SucursalState {
  list: Sucursal[];
  loading: boolean;
  saving: boolean;
  error: unknown | null;
}

export const initialSucursalState: SucursalState = {
  list: [],
  loading: false,
  saving: false,
  error: null,
};

export const SUCURSAL_FEATURE_KEY = 'sucursalAdmin';
