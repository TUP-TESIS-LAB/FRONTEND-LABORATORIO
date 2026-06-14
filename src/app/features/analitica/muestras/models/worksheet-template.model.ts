export interface WorksheetTemplateAnalysis {
  analysisTypeId: number;
  displayOrder: number;
}

export interface WorksheetTemplate {
  id: number;
  name: string;
  analyses: WorksheetTemplateAnalysis[];
  active: boolean;
  version: number;
}

/** Body de create/update (POST/PUT /worksheets/templates). */
export interface SaveWorksheetTemplateBody {
  name: string;
  analyses: WorksheetTemplateAnalysis[];
}
