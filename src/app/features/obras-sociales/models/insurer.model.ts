import { PlanComplete } from './plan.model';
import { InsurerContactInfo } from './contact-info.model';

export type InsurerTypeCode = 'SOCIAL' | 'PRIVATE' | 'SELF_PAY';

export interface SpecificData {
  socialHealth?: { cuit: string } | null;
  privateHealth?: { cuit: string; copayPolicy: string } | null;
  selfPay?: { acceptedPaymentMethods: string } | null;
}

export interface InsurerSummary {
  id: number;
  code: string;
  acronym: string;
  name: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;
  active: boolean;
}

export interface InsurerComplete {
  id: number;
  code: string;
  name: string;
  acronym: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;
  description?: string;
  authorizationUrl?: string;
  active: boolean;
  specificData?: SpecificData | null;
  plans: PlanComplete[];
  contacts: InsurerContactInfo[];
}

export const INSURER_TYPE_LABELS: Record<InsurerTypeCode, string> = {
  SOCIAL: 'Obra Social',
  PRIVATE: 'Prepaga',
  SELF_PAY: 'Particular',
};

export function humanizeInsurerType(code: InsurerTypeCode): string {
  return INSURER_TYPE_LABELS[code] ?? code;
}
