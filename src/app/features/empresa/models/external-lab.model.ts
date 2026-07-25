export type ContactType = 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';

export interface ExternalLabAddress {
  street: string;
  streetNumber: string;
  city: string;
  province: string;
}

export interface ExternalLabContact {
  contactType: ContactType;
  value: string;
}

export interface ExternalLab {
  id: number;
  name: string;
  taxId: string | null;
  responsibleName: string | null;
  notes: string | null;
  address: ExternalLabAddress;
  contacts: ExternalLabContact[];
  active: boolean;
  deletedAt: string | null;
  updatedAt: string | null;
}

export interface ExternalLabRequest {
  name: string;
  taxId?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  address: ExternalLabAddress;
  contacts: ExternalLabContact[];
}

export type ExternalLabState = 'active' | 'inactive' | 'all';
