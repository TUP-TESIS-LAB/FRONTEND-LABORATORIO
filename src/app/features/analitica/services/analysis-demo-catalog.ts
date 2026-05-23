import { Analysis, AnalysisDetail } from '../models/atencion.model';

/**
 * Catálogo demo de análisis. Se usa cuando `AnalysisService.demoMode()` es true
 * (toggle en localStorage `analysis:demoMode = '1'`). Útil para probar el wizard
 * mientras el módulo Analysis no está implementado en el backend.
 */
export const ANALYSIS_DEMO_CATALOG: ReadonlyArray<AnalysisDetail> = [
  {
    id: 1001, shortCode: 1001, name: 'Hemograma completo', familyName: 'Hematología',
    ubCount: 3, description: 'Recuento de glóbulos rojos, blancos y plaquetas',
    determinations: [
      { id: 1, name: 'Glóbulos rojos' },
      { id: 2, name: 'Glóbulos blancos' },
      { id: 3, name: 'Hemoglobina' },
      { id: 4, name: 'Hematocrito' },
      { id: 5, name: 'Plaquetas' },
    ],
    processingTime: 4, processingTimeUnit: 'HOURS', nbuCode: 'NBU-101',
  },
  {
    id: 1002, shortCode: 1002, name: 'Glucemia en ayunas', familyName: 'Química clínica',
    ubCount: 2, description: 'Glucosa en sangre con ayuno mínimo de 8 hs',
    determinations: [{ id: 6, name: 'Glucosa' }],
    processingTime: 2, processingTimeUnit: 'HOURS', nbuCode: 'NBU-205',
  },
  {
    id: 1003, shortCode: 1003, name: 'Orina completa', familyName: 'Uroanálisis',
    ubCount: 2, description: 'Análisis físico, químico y sedimento urinario',
    determinations: [
      { id: 7, name: 'Densidad' }, { id: 8, name: 'pH' },
      { id: 9, name: 'Proteínas' }, { id: 10, name: 'Glucosa' }, { id: 11, name: 'Sedimento' },
    ],
    processingTime: 3, processingTimeUnit: 'HOURS', nbuCode: 'NBU-310',
  },
  {
    id: 1004, shortCode: 1004, name: 'Colesterol total', familyName: 'Química clínica',
    ubCount: 2, description: 'Colesterol sérico total',
    determinations: [{ id: 12, name: 'Colesterol' }],
    processingTime: 4, processingTimeUnit: 'HOURS', nbuCode: 'NBU-211',
  },
  {
    id: 1005, shortCode: 1005, name: 'Perfil lipídico', familyName: 'Química clínica',
    ubCount: 6, description: 'Colesterol total, HDL, LDL, triglicéridos',
    determinations: [
      { id: 13, name: 'Colesterol total' }, { id: 14, name: 'HDL' },
      { id: 15, name: 'LDL' }, { id: 16, name: 'Triglicéridos' },
    ],
    processingTime: 6, processingTimeUnit: 'HOURS', nbuCode: 'NBU-220',
  },
  {
    id: 1006, shortCode: 1006, name: 'TSH', familyName: 'Endocrinología',
    ubCount: 5, description: 'Hormona estimulante de la tiroides',
    determinations: [{ id: 17, name: 'TSH' }],
    processingTime: 1, processingTimeUnit: 'DAYS', nbuCode: 'NBU-410',
  },
  {
    id: 1007, shortCode: 1007, name: 'Hepatograma', familyName: 'Química clínica',
    ubCount: 8, description: 'Función hepática: GOT, GPT, FAL, bilirrubina',
    determinations: [
      { id: 18, name: 'GOT' }, { id: 19, name: 'GPT' },
      { id: 20, name: 'FAL' }, { id: 21, name: 'Bilirrubina total' },
    ],
    processingTime: 6, processingTimeUnit: 'HOURS', nbuCode: 'NBU-230',
  },
  {
    id: 1008, shortCode: 1008, name: 'Urea y creatinina', familyName: 'Función renal',
    ubCount: 3, description: 'Marcadores de función renal',
    determinations: [{ id: 22, name: 'Urea' }, { id: 23, name: 'Creatinina' }],
    processingTime: 4, processingTimeUnit: 'HOURS', nbuCode: 'NBU-240',
  },
  {
    id: 1009, shortCode: 1009, name: 'PCR cuantitativa', familyName: 'Inflamación',
    ubCount: 4, description: 'Proteína C reactiva',
    determinations: [{ id: 24, name: 'PCR' }],
    processingTime: 4, processingTimeUnit: 'HOURS', nbuCode: 'NBU-510',
  },
  {
    id: 1010, shortCode: 1010, name: 'VSG (eritrosedimentación)', familyName: 'Hematología',
    ubCount: 1, description: 'Velocidad de sedimentación globular',
    determinations: [{ id: 25, name: 'VSG' }],
    processingTime: 2, processingTimeUnit: 'HOURS', nbuCode: 'NBU-105',
  },
];

/** Versión liviana del catálogo (sin description/determinations) para listados. */
export const ANALYSIS_DEMO_INDEX: ReadonlyArray<Analysis> = ANALYSIS_DEMO_CATALOG.map(
  ({ id, shortCode, name, familyName, ubCount }) => ({ id, shortCode, name, familyName, ubCount }),
);
