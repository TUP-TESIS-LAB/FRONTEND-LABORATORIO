export interface ReportTemplate {
  hasHeaderLogo: boolean;
  hasWatermark: boolean;
  footerLink: string | null;
  accreditationLegend: string | null;
  /** Empleado elegido como firmante autorizante del informe. Null = sin firmante. */
  authorizedSignerEmployeeId: number | null;
}

export interface GuardarReportTemplateTextPayload {
  footerLink: string | null;
  accreditationLegend: string | null;
  /** Empleado (id) elegido como firmante autorizante. Null limpia el firmante. */
  authorizedSignerEmployeeId: number | null;
}

/**
 * Candidato a firmante autorizante: un admin del tenant con empleado asociado.
 * `hasSignature` es informativo para la UI — un admin sin firma sigue siendo elegible,
 * pero el informe mostraría "-" en "Autorizado por".
 */
export interface AuthorizerCandidate {
  employeeId: number;
  fullName: string;
  registration: string | null;
  hasSignature: boolean;
}
