export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  name: string;
  roles: string[];
  exp: number;
  iat: number;
}
