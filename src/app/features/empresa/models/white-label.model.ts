export interface WhiteLabel {
  id: number;
  targetTenantId: number;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  active: boolean;
}

export interface GuardarWhiteLabelPayload {
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
}
