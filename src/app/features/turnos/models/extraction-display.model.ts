export type ExtractionDisplayStatus = 'WAITING' | 'CALLED';

export interface ExtractionDisplayEntry {
  publicCode: string;
  displayStatus: ExtractionDisplayStatus;
  boxNumber: number | null;
  calledAt: string | null;
}

export interface ExtractionDisplaySnapshot {
  tenantName: string;
  branchName: string;
  entries: ExtractionDisplayEntry[];
}
