import { Agreement } from './agreement.model';

export interface PlanComplete {
  id: number;
  insurerId: number;
  insurerName: string;
  code: string;
  acronym: string;
  name: string;
  description?: string;
  isActive: boolean;
  iva: number;                    // %
  actualAgreements: Agreement[];
}
