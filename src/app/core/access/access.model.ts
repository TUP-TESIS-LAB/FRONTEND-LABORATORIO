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
  | 'DOMICILIO'
  | 'DOMICILIO_RUTA';

export interface SectionResponse {
  code: AccessSection;
  label: string;
}
