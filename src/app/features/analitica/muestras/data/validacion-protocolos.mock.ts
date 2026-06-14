// validacion-protocolos.mock.ts — datos mock (en memoria) de la pantalla "Validación".
//
// NOTA: esto es UI hardcodeada para mostrar cómo va a verse la pantalla. NO viene del
// backend ni del store; cuando exista el endpoint real, este archivo se reemplaza por
// un selector de ngrx (ver skill ngrx-backend-request). Vive en el feature, no en /shared,
// porque es específico de Validación.
//
// Un PROTOCOLO agrupa los análisis solicitados de un paciente en una fecha. Cada ANÁLISIS
// pertenece a una familia de estudio y tiene un estado de firma (firmado: true/false). El
// estado del protocolo se deriva de sus análisis:
//   sin firma  = ningún análisis firmado
//   parcial    = algunos firmados
//   total      = todos firmados

export type SeccionKey = 'HEMATO' | 'QUIMICA' | 'ENDO';

/** Flag de un valor fuera de rango: 'H' (alto) / 'L' (bajo) / null (en rango). */
export type DetFlag = 'H' | 'L' | null;

export interface Determinacion {
  /** Nombre de la determinación (ej. "Hemoglobina"). */
  n: string;
  /** Valor medido. */
  v: string;
  /** Unidad. */
  u: string;
  /** Rango de referencia. */
  ref: string;
  /** Marca de fuera de rango. */
  flag: DetFlag;
}

export interface AnalisisProtocolo {
  id: string;
  nombre: string;
  sec: SeccionKey;
  firmado: boolean;
  dets: Determinacion[];
}

export interface Protocolo {
  id: string;
  paciente: string;
  sexo: 'M' | 'F';
  edad: number;
  fecha: string;
  hora: string;
  urgente: boolean;
  firmadoPor?: string;
  firmadoEl?: string;
  analisis: AnalisisProtocolo[];
}

export type EstadoProtocolo = 'sin' | 'parcial' | 'total';

export const SECCIONES: Record<SeccionKey, { label: string; hue: number }> = {
  HEMATO: { label: 'Hematología', hue: 12 },
  QUIMICA: { label: 'Química clínica', hue: 250 },
  ENDO: { label: 'Endocrinología', hue: 160 },
};

// helper corto para una determinación
const d = (n: string, v: string, u: string, ref: string, flag: DetFlag = null): Determinacion =>
  ({ n, v, u, ref, flag });

export const PROTOCOLOS: Protocolo[] = [
  {
    id: 'P-2606-0040', paciente: 'García, Carlos', sexo: 'M', edad: 54,
    fecha: '13/06', hora: '20:05', urgente: true,
    analisis: [
      { id: 'hemograma', nombre: 'Hemograma completo', sec: 'HEMATO', firmado: false, dets: [
        d('Eritrocitos', '5.2', 'mill/mm³', '4.5 – 5.9'),
        d('Hematocrito', '55', '%', '40 – 54', 'H'),
        d('Hemoglobina', '17.9', 'g/dL', '13.5 – 17.5', 'H'),
        d('V.C.M.', '92', 'fL', '80 – 100'),
        d('H.C.M.', '30.4', 'pg', '27 – 33'),
        d('C.H.C.M.', '34.1', 'g/dL', '32 – 36'),
        d('R.D.W.', '13.2', '%', '11.5 – 14.5'),
        d('Leucocitos', '8400', '/mm³', '4000 – 10000'),
      ] },
      { id: 'hepatico', nombre: 'Hepatograma', sec: 'QUIMICA', firmado: false, dets: [
        d('TGO (AST)', '58', 'U/L', '5 – 40', 'H'),
        d('TGP (ALT)', '64', 'U/L', '5 – 41', 'H'),
        d('Fosfatasa alcalina', '96', 'U/L', '40 – 130'),
        d('Bilirrubina total', '1.0', 'mg/dL', '0.3 – 1.2'),
      ] },
    ],
  },
  {
    id: 'P-2606-0041', paciente: 'Fernández, Roberto', sexo: 'M', edad: 61,
    fecha: '10/06', hora: '19:54', urgente: false,
    firmadoPor: 'Dra. A. Duarte', firmadoEl: '10/06 · 21:10',
    analisis: [
      { id: 'tiroides', nombre: 'Perfil tiroideo', sec: 'ENDO', firmado: true, dets: [
        d('TSH', '2.41', 'µUI/mL', '0.40 – 4.00'),
        d('T4 libre', '1.25', 'ng/dL', '0.80 – 1.80'),
      ] },
      { id: 'glucemia', nombre: 'Glucemia', sec: 'QUIMICA', firmado: true, dets: [
        d('Glucosa', '98', 'mg/dL', '70 – 110'),
      ] },
    ],
  },
  {
    id: 'P-2606-0042', paciente: 'López, María', sexo: 'F', edad: 43,
    fecha: '13/06', hora: '19:12', urgente: false,
    analisis: [
      { id: 'hepatico', nombre: 'Hepatograma', sec: 'QUIMICA', firmado: true, dets: [
        d('TGO (AST)', '22', 'U/L', '5 – 40'),
        d('TGP (ALT)', '19', 'U/L', '5 – 41'),
        d('Fosfatasa alcalina', '84', 'U/L', '40 – 130'),
        d('Bilirrubina total', '0.7', 'mg/dL', '0.3 – 1.2'),
      ] },
      { id: 'lipidico', nombre: 'Perfil lipídico', sec: 'QUIMICA', firmado: false, dets: [
        d('Colesterol total', '232', 'mg/dL', '< 200', 'H'),
        d('Colesterol HDL', '44', 'mg/dL', '> 40'),
        d('Colesterol LDL', '151', 'mg/dL', '< 100', 'H'),
        d('Triglicéridos', '186', 'mg/dL', '< 150', 'H'),
      ] },
      { id: 'hemograma', nombre: 'Hemograma completo', sec: 'HEMATO', firmado: false, dets: [
        d('Eritrocitos', '4.6', 'mill/mm³', '4.0 – 5.4'),
        d('Hematocrito', '41', '%', '36 – 47'),
        d('Hemoglobina', '13.6', 'g/dL', '12.0 – 16.0'),
        d('V.C.M.', '88', 'fL', '80 – 100'),
        d('Leucocitos', '6900', '/mm³', '4000 – 10000'),
      ] },
    ],
  },
  {
    id: 'P-2606-0043', paciente: 'Romero, Marta', sexo: 'F', edad: 38,
    fecha: '13/06', hora: '18:40', urgente: false,
    analisis: [
      { id: 'renal', nombre: 'Función renal', sec: 'QUIMICA', firmado: false, dets: [
        d('Urea', '31', 'mg/dL', '15 – 45'),
        d('Creatinina', '0.84', 'mg/dL', '0.60 – 1.10'),
        d('Ácido úrico', '4.2', 'mg/dL', '2.4 – 5.7'),
      ] },
    ],
  },
  {
    id: 'P-2606-0044', paciente: 'Díaz, Jorge', sexo: 'M', edad: 29,
    fecha: '13/06', hora: '18:05', urgente: true,
    analisis: [
      { id: 'hemograma', nombre: 'Hemograma completo', sec: 'HEMATO', firmado: true, dets: [
        d('Eritrocitos', '5.0', 'mill/mm³', '4.5 – 5.9'),
        d('Hematocrito', '46', '%', '40 – 54'),
        d('Hemoglobina', '15.4', 'g/dL', '13.5 – 17.5'),
        d('Leucocitos', '7200', '/mm³', '4000 – 10000'),
      ] },
      { id: 'coagulograma', nombre: 'Coagulograma', sec: 'HEMATO', firmado: false, dets: [
        d('Tiempo de protrombina', '62', '%', '70 – 130', 'L'),
        d('KPTT', '41', 'seg', '25 – 38', 'H'),
        d('Fibrinógeno', '310', 'mg/dL', '200 – 400'),
      ] },
    ],
  },
  {
    id: 'P-2606-0038', paciente: 'Castillo, Lucía', sexo: 'F', edad: 52,
    fecha: '12/06', hora: '11:20', urgente: false,
    firmadoPor: 'Dra. A. Duarte', firmadoEl: '12/06 · 13:02',
    analisis: [
      { id: 'glucemia', nombre: 'Glucemia', sec: 'QUIMICA', firmado: true, dets: [
        d('Glucosa', '104', 'mg/dL', '70 – 110'),
      ] },
      { id: 'lipidico', nombre: 'Perfil lipídico', sec: 'QUIMICA', firmado: true, dets: [
        d('Colesterol total', '178', 'mg/dL', '< 200'),
        d('Colesterol HDL', '58', 'mg/dL', '> 40'),
        d('Colesterol LDL', '92', 'mg/dL', '< 100'),
        d('Triglicéridos', '121', 'mg/dL', '< 150'),
      ] },
    ],
  },
  {
    id: 'P-2606-0037', paciente: 'Vega, Pablo', sexo: 'M', edad: 47,
    fecha: '12/06', hora: '10:05', urgente: false,
    firmadoPor: 'Dra. A. Duarte', firmadoEl: '12/06 · 12:18',
    analisis: [
      { id: 'tiroides', nombre: 'Perfil tiroideo', sec: 'ENDO', firmado: true, dets: [
        d('TSH', '3.10', 'µUI/mL', '0.40 – 4.00'),
        d('T4 libre', '1.05', 'ng/dL', '0.80 – 1.80'),
      ] },
    ],
  },
  {
    id: 'P-2606-0036', paciente: 'Acuña, Tomás', sexo: 'M', edad: 34,
    fecha: '11/06', hora: '09:15', urgente: false,
    firmadoPor: 'Bioq. M. Sosa', firmadoEl: '11/06 · 16:44',
    analisis: [
      { id: 'renal', nombre: 'Función renal', sec: 'QUIMICA', firmado: true, dets: [
        d('Urea', '38', 'mg/dL', '15 – 45'),
        d('Creatinina', '1.02', 'mg/dL', '0.70 – 1.30'),
        d('Ácido úrico', '6.1', 'mg/dL', '3.5 – 7.2'),
      ] },
      { id: 'hepatico', nombre: 'Hepatograma', sec: 'QUIMICA', firmado: true, dets: [
        d('TGO (AST)', '27', 'U/L', '5 – 40'),
        d('TGP (ALT)', '31', 'U/L', '5 – 41'),
        d('Fosfatasa alcalina', '71', 'U/L', '40 – 130'),
        d('Bilirrubina total', '0.6', 'mg/dL', '0.3 – 1.2'),
      ] },
    ],
  },
];

// ---- helpers de dominio ----
export const detsDe = (p: Protocolo): number =>
  p.analisis.reduce((n, a) => n + a.dets.length, 0);

export const firmadosDe = (p: Protocolo): number =>
  p.analisis.filter(a => a.firmado).length;

/** estado de firma del protocolo: "sin" | "parcial" | "total". */
export function estadoProt(p: Protocolo): EstadoProtocolo {
  const f = firmadosDe(p);
  const t = p.analisis.length;
  if (f === 0) return 'sin';
  if (f < t) return 'parcial';
  return 'total';
}

/** badge visual del protocolo: [claseCss, etiqueta]. */
export function badgeProt(p: Protocolo): [string, string] {
  const e = estadoProt(p);
  if (e === 'total') return ['st-cargado', 'Firma total'];
  if (e === 'parcial') return ['st-parcial', 'Firma parcial'];
  return ['st-sin', 'Sin firma'];
}

export interface FiltroValidacion {
  id: 'todos' | EstadoProtocolo;
  label: string;
}

export const FILTROS: FiltroValidacion[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin', label: 'Sin firma' },
  { id: 'parcial', label: 'Firma parcial' },
  { id: 'total', label: 'Firma total' },
];

/** Busca un protocolo por id; cae al primero si no existe (mock). */
export const findProtocolo = (id: string | null): Protocolo =>
  PROTOCOLOS.find(p => p.id === id) ?? PROTOCOLOS[0];
