export interface SmtpConfig {
  configured: boolean;
  gmailUsername: string | null;
  fromName: string | null;
  active: boolean;
  updatedAt: string | null;
}

export interface GuardarSmtpConfigPayload {
  gmailUsername: string;
  appPassword?: string | null;
  fromName?: string | null;
  active?: boolean;
}

export interface EnviarTestEmailPayload {
  to: string;
}

export interface TestEmailResult {
  delivered: boolean;
  sentAt: string;
}
