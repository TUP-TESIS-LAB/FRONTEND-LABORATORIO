import type { Sample } from '../models/sample.model';

// Helpers determinísticos
const studies = [
  'Hemograma completo',
  'Perfil tiroideo (TSH/T3/T4)',
  'Glucemia + HbA1c',
  'Perfil lipídico',
  'Función hepática',
  'Función renal',
  'Coagulograma',
  'Orina completa',
];

const patients = [
  'García, M.', 'Pérez, J.', 'López, A.', 'Martínez, S.', 'Rodríguez, P.',
  'Gómez, L.', 'Fernández, R.', 'Sánchez, C.', 'Romero, V.', 'Álvarez, D.',
  'Torres, E.', 'Ruiz, F.', 'Acosta, M.', 'Núñez, I.', 'Vargas, B.',
];

const branches = ['CENTRAL — Sede Central', 'NORTE — Belgrano', 'OESTE — Morón'];

function sample(i: number, state: Sample['state'], overrides: Partial<Sample> = {}): Sample {
  const num = 40800 + i;
  const hour = 7 + (i % 4);
  const minute = (i * 7) % 60;
  const ts = `2026-06-07T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  return {
    id: `s-${num}`,
    barcode: `MX-2606-${num}`,
    study: studies[i % studies.length],
    patient: patients[i % patients.length],
    branch: branches[i % branches.length],
    receivedAt: ts,
    urgent: i % 5 === 0,
    state,
    ...overrides,
  };
}

export const SEED: Sample[] = [
  // Recolección — 16 en collected
  ...Array.from({ length: 16 }, (_, i) => sample(i, 'collected')),
  // Traslado — 10 en transito, con destino poblado
  ...Array.from({ length: 10 }, (_, i) =>
    sample(i + 20, 'transito', { destino: 'Recepción central' }),
  ),
  // Procesamiento — 9 en processing, con area poblada
  ...Array.from({ length: 9 }, (_, i) =>
    sample(i + 40, 'processing', {
      area: ['Hematología', 'Química clínica', 'Microbiología'][i % 3],
    }),
  ),
  // Descarte — 7 en completed
  ...Array.from({ length: 7 }, (_, i) => sample(i + 60, 'completed')),
];
