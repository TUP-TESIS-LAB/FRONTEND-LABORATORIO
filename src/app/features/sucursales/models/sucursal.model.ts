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
  atencionBoxesCount: number;
  extraccionBoxesCount: number;
  /** Override opcional del director técnico configurado en Empresa → Informe PDF. */
  technicalDirectorName?: string | null;
  technicalDirectorRegistration?: string | null;
}

export interface SucursalCreateInput {
  code: string;
  description: string;
  status: SucursalStatus;
  address?: Address;
  responsibleUserId?: number | null;
  atencionBoxesCount: number;
  extraccionBoxesCount: number;
  technicalDirectorName?: string | null;
  technicalDirectorRegistration?: string | null;
}

export type SucursalUpdateInput = SucursalCreateInput;

export type AreaType =
  | 'QUIMICA_CLINICA'
  | 'HEMATOLOGIA_HEMOSTASIA'
  | 'NEFROLOGIA'
  | 'MEDIO_INTERNO'
  | 'ENDOCRINOLOGIA_VIROLOGIA'
  | 'MICROBIOLOGIA'
  | 'INMUNOLOGIA_SEROLOGIA'
  | 'EXTERNO'
  | 'OTRO';

export interface Area {
  id: number;
  name: string;
  areaType: AreaType;
  externalLabName: string | null;
  active: boolean;
}

export interface AreaCreateInput {
  name: string;
  areaType: AreaType;
  externalLabName?: string | null;
}
