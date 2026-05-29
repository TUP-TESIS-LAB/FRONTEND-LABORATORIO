import { createAction, props } from '@ngrx/store';
import { Sucursal, SucursalCreateInput, SucursalUpdateInput } from '../models/sucursal.model';

export const loadSucursales = createAction('[Sucursales] Load');
export const loadSucursalesSuccess = createAction('[Sucursales] Load Success', props<{ list: Sucursal[] }>());
export const loadSucursalesFailure = createAction('[Sucursales] Load Failure', props<{ error: unknown }>());

export const addSucursal = createAction('[Sucursales] Add', props<{ input: SucursalCreateInput }>());
export const addSucursalSuccess = createAction('[Sucursales] Add Success', props<{ sucursal: Sucursal }>());
export const addSucursalFailure = createAction('[Sucursales] Add Failure', props<{ error: unknown }>());

export const updateSucursal = createAction('[Sucursales] Update', props<{ id: number; input: SucursalUpdateInput }>());
export const updateSucursalSuccess = createAction('[Sucursales] Update Success', props<{ sucursal: Sucursal }>());
export const updateSucursalFailure = createAction('[Sucursales] Update Failure', props<{ error: unknown }>());

export const toggleSucursalStatus = createAction('[Sucursales] Toggle Status', props<{ id: number }>());
export const toggleSucursalStatusSuccess = createAction('[Sucursales] Toggle Status Success', props<{ sucursal: Sucursal }>());
export const toggleSucursalStatusFailure = createAction('[Sucursales] Toggle Status Failure', props<{ error: unknown }>());

export const deleteSucursal = createAction('[Sucursales] Delete', props<{ id: number }>());
export const deleteSucursalSuccess = createAction('[Sucursales] Delete Success', props<{ id: number }>());
export const deleteSucursalFailure = createAction('[Sucursales] Delete Failure', props<{ error: unknown }>());
