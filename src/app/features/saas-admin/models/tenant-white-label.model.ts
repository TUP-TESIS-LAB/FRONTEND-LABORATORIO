export interface TenantWhiteLabel {
  id: number;
  targetTenantId: number;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  active: boolean;
}

export interface UpsertTenantWhiteLabelRequest {
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
}
