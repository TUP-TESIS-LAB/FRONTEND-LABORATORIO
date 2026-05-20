export type TenantStatus = 'ACTIVE' | 'INACTIVE';

export interface Tenant {
  id: number;
  code: string;
  name: string;
  status: TenantStatus;
  active: boolean;
  deletedAt: string | null;
}

export interface CreateTenantRequest {
  code: string;
  name: string;
}

export interface UpdateTenantRequest {
  name: string;
}
