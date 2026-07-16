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

/** Fila del formulario enriquecido (GET /worksheets/templates/{id}/form) — GAP-P3. */
export interface WorksheetFormAnalysis {
  analysisTypeId: number;
  displayOrder: number;
  analysisName: string | null;
}

export interface WorksheetForm {
  templateId: number;
  templateName: string;
  analyses: WorksheetFormAnalysis[];
}
