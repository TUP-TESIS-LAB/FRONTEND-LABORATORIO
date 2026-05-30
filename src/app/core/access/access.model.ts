export type AccessSection =
  | 'ATENCION'
  | 'EXTRACCIONES'
  | 'PREANALITICA'
  | 'ANALITICA'
  | 'POSTANALITICA'
  | 'PACIENTES'
  | 'TURNOS'
  | 'FINANCIERO'
  | 'OBRAS_SOCIALES'
  | 'STOCK'
  | 'PORTAL'
  | 'SUCURSALES';

export interface SectionResponse {
  code: AccessSection;
  label: string;
}
