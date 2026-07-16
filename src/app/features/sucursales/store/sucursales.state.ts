import { HttpErrorResponse } from '@angular/common/http';
import { Sucursal, Area } from '../models/sucursal.model';

export interface SucursalesState {
  sucursales: Sucursal[];
  areas: Area[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialSucursalesState: SucursalesState = {
  sucursales: [],
  areas: [],
  pending: false,
  error: null,
};

export const SUCURSALES_FEATURE_KEY = 'sucursales';
