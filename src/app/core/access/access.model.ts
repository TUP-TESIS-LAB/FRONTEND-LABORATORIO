export type AccessSection =
  | 'RECEPCION'
  | 'PACIENTES'
  | 'AGENDAS'
  | 'MEDICOS'
  | 'PREANALITICA'
  | 'ANALITICA'
  | 'POSTANALITICA'
  | 'EXTRACCIONES'
  | 'EMPRESA'
  | 'SUCURSALES'
  | 'OBRAS_SOCIALES'
  | 'FINANCIERO'
  | 'STOCK'
  | 'DOMICILIO';

export interface SectionResponse {
  code: AccessSection;
  label: string;
}
