export const CURRENT_BRANCH = 'CENTRAL — Sede Central';

export const BRANCHES: ReadonlyArray<string> = [
  'CENTRAL — Sede Central',
  'NORTE — Belgrano',
  'OESTE — Morón',
  'SUR — Lanús',
  'ESTE — Quilmes',
];

export const AREAS: ReadonlyArray<string> = [
  'Hematología',
  'Química clínica',
  'Endocrinología',
  'Microbiología',
  'Inmunología',
  'Coagulación',
  'Uroanálisis',
  'Biología molecular',
];

export const LABS: ReadonlyArray<string> = [
  'Lab. Referencia Genómica',
  'CIBIC — Alta complejidad',
  'Centro Biomédico Externo',
  'Lab. Referencia Norte',
];

// STUDIES fusionado: worklist actuales + 11 del handoff (sin duplicar)
export const STUDIES: ReadonlyArray<string> = [
  // del worklist actual
  'Hemograma completo',
  'Perfil tiroideo (TSH/T3/T4)',
  'Glucemia + HbA1c',
  'Perfil lipídico',
  'Función hepática',
  'Función renal',
  'Coagulograma',
  'Orina completa',
  'PCR cuantitativa',
  'Vitamina D',
  'Ferritina',
  'Test de embarazo',
  // del handoff (los que no se solapaban)
  'Glucemia',
  'Hepatograma',
  'TSH',
  'Urocultivo',
  'Ionograma plasmático',
  'Vitamina D (25-OH)',
  'Hemoglobina glicosilada',
  'Proteína C reactiva',
  'Creatinina',
  'Urea',
  'Serología Hepatitis B',
];

// NUEVO — secciones de laboratorio (handoff)
export const SECTIONS: ReadonlyArray<string> = [
  'Autoanalizador A1',
  'Autoanalizador A2',
  'Mesada manual',
  'Citometría',
  'Microscopía',
  'Inmunoensayo',
  'Cultivos',
  'Coagulómetro',
  'Sedimento',
  'PCR / NAT',
  'Guardia / Urgencias',
];

// NUEVO — mochila: study → area
export const STUDY_AREA: Readonly<Record<string, string>> = {
  'Hemograma completo': 'Hematología',
  'Perfil tiroideo (TSH/T3/T4)': 'Endocrinología',
  'Glucemia + HbA1c': 'Química clínica',
  'Perfil lipídico': 'Química clínica',
  'Función hepática': 'Química clínica',
  'Función renal': 'Química clínica',
  'Coagulograma': 'Coagulación',
  'Orina completa': 'Uroanálisis',
  'PCR cuantitativa': 'Inmunología',
  'Vitamina D': 'Endocrinología',
  'Ferritina': 'Inmunología',
  'Test de embarazo': 'Química clínica',
  'Glucemia': 'Química clínica',
  'Hepatograma': 'Química clínica',
  'TSH': 'Endocrinología',
  'Urocultivo': 'Microbiología',
  'Ionograma plasmático': 'Química clínica',
  'Vitamina D (25-OH)': 'Endocrinología',
  'Hemoglobina glicosilada': 'Química clínica',
  'Proteína C reactiva': 'Inmunología',
  'Creatinina': 'Química clínica',
  'Urea': 'Química clínica',
  'Serología Hepatitis B': 'Biología molecular',
};

// NUEVO — área → sección default
export const AREA_SECTION: Readonly<Record<string, string>> = {
  'Hematología': 'Citometría',
  'Química clínica': 'Autoanalizador A1',
  'Endocrinología': 'Inmunoensayo',
  'Microbiología': 'Cultivos',
  'Inmunología': 'Mesada manual',
  'Coagulación': 'Coagulómetro',
  'Uroanálisis': 'Sedimento',
  'Biología molecular': 'PCR / NAT',
};

// NUEVO — área → sucursal que procesa (clave del ruteo)
export const AREA_BRANCH: Readonly<Record<string, string>> = {
  'Hematología': 'CENTRAL — Sede Central',
  'Química clínica': 'CENTRAL — Sede Central',
  'Endocrinología': 'NORTE — Belgrano',
  'Microbiología': 'OESTE — Morón',
  'Inmunología': 'CENTRAL — Sede Central',
  'Coagulación': 'CENTRAL — Sede Central',
  'Uroanálisis': 'CENTRAL — Sede Central',
  'Biología molecular': 'SUR — Lanús',
};

// Fallback defensivo para muestras con estudios fuera del mapa
export const DEFAULT_AREA = 'Química clínica';
