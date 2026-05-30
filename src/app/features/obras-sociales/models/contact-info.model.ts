export type ContactTypeCode = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'WEBSITE';

export interface InsurerContactInfo {
  id: number;
  insurerId: number;
  contactType: ContactTypeCode;
  contact: string;
  isActive: boolean;
}

export interface ContactType {
  name: ContactTypeCode;
  description: string;
}

export const CONTACT_TYPE_LABELS: Record<ContactTypeCode, string> = {
  PHONE: 'Teléfono',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  WEBSITE: 'Sitio web',
};
