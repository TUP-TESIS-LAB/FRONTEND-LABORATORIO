// src/app/features/saas-admin/models/tenant.model.ts
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
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerDocument: string;
  ownerUsername: string;
}

export interface CreateTenantResponse extends Tenant {
  ownerFirstLoginToken: string;
}

export interface UpdateTenantRequest {
  name: string;
}
