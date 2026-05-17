export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  tenantId: number;
  userId: number;
  roles: string[];
  isExternal: boolean;
  exp: number;
  iat: number;
}
