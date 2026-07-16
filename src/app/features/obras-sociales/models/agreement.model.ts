export interface Agreement {
  id: number;
  insurerPlanId: number;
  insurerPlanName?: string;
  versionNbu: number;             // id de NbuVersion
  ubValue: number;                // > 0
  validFromDate: string;          // ISO yyyy-MM-dd
  validToDate?: string | null;
}
