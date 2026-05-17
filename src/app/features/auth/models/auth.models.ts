export interface RoleResponse {
  id: number;
  code: string;
  description: string;
  hierarchy: number;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string | null;
  document: string | null;
  isEmailVerified: boolean;
  isExternal: boolean;
  branch: number | null;
  isFirstLogin: boolean;
  active: boolean;
  roles: RoleResponse[];
}

export interface LoginResponse {
  token: string | null;
  firstLoginToken: string | null;
  user: UserResponse;
  isFirstLogin: boolean;
}

export interface SetFirstLoginPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
