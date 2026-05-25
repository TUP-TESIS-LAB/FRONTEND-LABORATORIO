import { Analysis, AnalysisDetail } from '../models/atencion.model';

/**
 * Catálogo demo de 100 análisis. Se usa cuando `AnalysisService.demoMode()` es
 * true (toggle en localStorage `analysis:demoMode = '1'`). Útil para probar el
 * wizard mientras el módulo Analysis no existe en el backend.
 *
 * NOTA tenant-awareness: el catálogo es tenant-agnóstico — la misma data
 * aparece para cualquier tenant logueado. Si en el futuro necesitás demo data
 * distinta por tenant, el AnalysisService puede leer `TenantContext` y filtrar
 * desde acá; por ahora todos los tenants ven los 100 análisis.
 */

interface FamilyDef {
  prefix: number;     // shortCodes empiezan en este número (10 análisis cada familia)
  name: string;
  shortcodeBase: number;
  practiceNames: string[]; // 10 nombres por familia
  nbuPrefix: string;
  baseUb: number;     // UBs base (cada análisis va sumando)
  processingHours: number;
}

const FAMILIES: FamilyDef[] = [
  {
    prefix: 10, name: 'Hematología', shortcodeBase: 1000, nbuPrefix: 'NBU-1', baseUb: 2, processingHours: 4,
    practiceNames: [
      'Hemograma completo', 'Recuento de plaquetas', 'VSG (eritrosedimentación)', 'Reticulocitos',
      'Frotis de sangre periférica', 'Grupo sanguíneo y factor Rh', 'Coombs directo', 'Coombs indirecto',
      'Coagulograma básico', 'Dímero D',
    ],
  },
  {
    prefix: 20, name: 'Química clínica', shortcodeBase: 2000, nbuPrefix: 'NBU-2', baseUb: 2, processingHours: 4,
    practiceNames: [
      'Glucemia en ayunas', 'Hemoglobina glicosilada (HbA1c)', 'Colesterol total', 'HDL colesterol',
      'LDL colesterol', 'Triglicéridos', 'Perfil lipídico completo', 'Ácido úrico',
      'Calcio sérico', 'Fósforo sérico',
    ],
  },
  {
    prefix: 30, name: 'Función hepática', shortcodeBase: 3000, nbuPrefix: 'NBU-3', baseUb: 3, processingHours: 6,
    practiceNames: [
      'Hepatograma completo', 'GOT (AST)', 'GPT (ALT)', 'Fosfatasa alcalina (FAL)',
      'Gamma GT (GGT)', 'Bilirrubina total', 'Bilirrubina directa', 'Albúmina sérica',
      'Proteínas totales', 'Tiempo de protrombina',
    ],
  },
  {
    prefix: 40, name: 'Función renal', shortcodeBase: 4000, nbuPrefix: 'NBU-4', baseUb: 2, processingHours: 4,
    practiceNames: [
      'Urea sérica', 'Creatinina sérica', 'Clearance de creatinina', 'Microalbuminuria',
      'Proteinuria 24 horas', 'Ionograma sérico', 'Magnesio sérico', 'Cistatina C',
      'Beta-2 microglobulina', 'Filtrado glomerular estimado',
    ],
  },
  {
    prefix: 50, name: 'Endocrinología', shortcodeBase: 5000, nbuPrefix: 'NBU-5', baseUb: 5, processingHours: 24,
    practiceNames: [
      'TSH (tirotrofina)', 'T4 libre', 'T3 libre', 'Anticuerpos antitiroideos (TPO)',
      'Insulina basal', 'Cortisol matutino', 'Testosterona total', 'Estradiol',
      'Progesterona', 'Prolactina',
    ],
  },
  {
    prefix: 60, name: 'Inmunología', shortcodeBase: 6000, nbuPrefix: 'NBU-6', baseUb: 4, processingHours: 12,
    practiceNames: [
      'PCR cuantitativa', 'Factor reumatoideo', 'ANA (anticuerpos antinucleares)', 'Anti-DNA',
      'C3 (complemento)', 'C4 (complemento)', 'Inmunoglobulina IgG', 'Inmunoglobulina IgA',
      'Inmunoglobulina IgM', 'ASLO (antiestreptolisina O)',
    ],
  },
  {
    prefix: 70, name: 'Microbiología', shortcodeBase: 7000, nbuPrefix: 'NBU-7', baseUb: 4, processingHours: 48,
    practiceNames: [
      'Urocultivo con antibiograma', 'Hemocultivo', 'Coprocultivo', 'Cultivo de fauces',
      'Cultivo de heridas', 'Examen directo de hongos', 'Test rápido de Streptococcus', 'Antígeno fecal H. pylori',
      'Búsqueda de parásitos en heces', 'Cultivo de esputo',
    ],
  },
  {
    prefix: 80, name: 'Serología viral', shortcodeBase: 8000, nbuPrefix: 'NBU-8', baseUb: 5, processingHours: 24,
    practiceNames: [
      'HIV (ELISA)', 'Hepatitis B (HBsAg)', 'Hepatitis B (anti-HBs)', 'Hepatitis C (anti-HCV)',
      'VDRL (sífilis)', 'IgG Toxoplasmosis', 'IgM Toxoplasmosis', 'IgG Citomegalovirus',
      'IgG Rubéola', 'IgG Sarampión',
    ],
  },
  {
    prefix: 90, name: 'Uroanálisis', shortcodeBase: 9000, nbuPrefix: 'NBU-9', baseUb: 2, processingHours: 3,
    practiceNames: [
      'Orina completa', 'Sedimento urinario', 'pH urinario', 'Densidad urinaria',
      'Glucosuria', 'Cetonuria', 'Bilirrubina en orina', 'Urobilinógeno',
      'Microalbúmina/creatinina urinaria', 'Calciuria 24 horas',
    ],
  },
  {
    prefix: 100, name: 'Marcadores tumorales', shortcodeBase: 10000, nbuPrefix: 'NBU-T', baseUb: 6, processingHours: 24,
    practiceNames: [
      'PSA total', 'PSA libre', 'CEA (antígeno carcinoembrionario)', 'CA 19-9',
      'CA 125', 'CA 15-3', 'Alfa-fetoproteína (AFP)', 'Beta-hCG cuantitativa',
      'Calcitonina', 'Tiroglobulina',
    ],
  },
];

/** Catálogo completo (100 análisis con detalle). */
export const ANALYSIS_DEMO_CATALOG: ReadonlyArray<AnalysisDetail> = FAMILIES.flatMap((fam) =>
  fam.practiceNames.map((name, idx) => {
    const shortCode = fam.shortcodeBase + idx + 1;
    const id = shortCode; // mismos IDs para que getById trabaje con shortCode también
    const ubCount = fam.baseUb + (idx % 4); // varía un poco para que los precios no sean uniformes
    return {
      id,
      shortCode,
      name,
      familyName: fam.name,
      ubCount,
      description: `Determinación bioquímica de ${name.toLowerCase()}.`,
      determinations: [{ id: id * 10 + 1, name }],
      processingTime: fam.processingHours + (idx % 3) * 2,
      processingTimeUnit: 'HOURS',
      nbuCode: `${fam.nbuPrefix}${String(idx + 1).padStart(3, '0')}`,
    } satisfies AnalysisDetail;
  }),
);

/** Versión liviana del catálogo (sin description/determinations) para listados. */
export const ANALYSIS_DEMO_INDEX: ReadonlyArray<Analysis> = ANALYSIS_DEMO_CATALOG.map(
  ({ id, shortCode, name, familyName, ubCount }) => ({ id, shortCode, name, familyName, ubCount }),
);
