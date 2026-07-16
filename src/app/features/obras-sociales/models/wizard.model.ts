import { InsurerTypeCode, SpecificData } from './insurer.model';
import { ContactTypeCode } from './contact-info.model';

export interface WizardInsurer {
  code: string;
  name: string;
  acronym: string;
  insurerType: InsurerTypeCode;
  description?: string;
  authorizationUrl?: string;
  specificData: SpecificData | null;
}

export interface WizardPlan {
  code: string;
  acronym: string;
  name: string;
  iva: number;
  description?: string;
}

export interface WizardAgreement {
  versionNbu: number;
  ubValue: number;
  validFromDate: string;          // ISO yyyy-MM-dd
}

export interface PlanWithAgreement {
  plan: WizardPlan;
  agreement: WizardAgreement;
}

export interface WizardContact {
  contactType: ContactTypeCode;
  contact: string;
}

export interface WizardCreate {
  insurer: WizardInsurer;
  plans: PlanWithAgreement[];
  contacts: WizardContact[];
}
