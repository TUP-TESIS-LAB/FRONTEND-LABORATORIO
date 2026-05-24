import { Address } from './address.model';

export type SucursalStatus = 'ACTIVE' | 'INACTIVE';

export interface Sucursal {
  id: number;
  code: string;
  description: string;
  status: SucursalStatus;
  address: Address | null;
  responsibleUserId: number | null;
  active: boolean;
}

export interface SucursalCreateInput {
  code: string;
  description: string;
  status: SucursalStatus;
  address?: Address;
  responsibleUserId?: number | null;
}

export type SucursalUpdateInput = SucursalCreateInput;
