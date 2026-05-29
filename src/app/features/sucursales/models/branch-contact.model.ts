export type ContactType = 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';

export interface BranchContact {
  id: number;
  branchId: number;
  contactType: ContactType;
  value: string;
  active: boolean;
}

export interface BranchContactCreateInput {
  contactType: ContactType;
  value: string;
}
