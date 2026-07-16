import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];
const BASE = '/api/v1/analitica/reportes/pacientes';

export const PACIENTES_REPORTS: ReportDef[] = [
  {
    id: 'R-PAC-02',
    title: 'Altas de pacientes por período',
    description: 'Pacientes dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas-por-periodo`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['periodo'],
    defaultSort: { field: 'periodo', direction: 'DESC' },
    filters: [
      {
        key: 'granularidad', label: 'Granularidad', type: 'select',
        options: [
          { label: 'Mensual', value: 'MES' },
          { label: 'Anual', value: 'ANIO' },
        ],
      },
    ],
    columns: withSortableColumns(
      [
        { field: 'periodo', header: 'Período' },
        { field: 'cantidadAltas', header: 'Cantidad de altas', align: 'right' },
      ],
      ['periodo'],
    ),
    // Serie temporal (D3/D4). Join contra atención (D2.1): el backend YA acepta branchId.
    branchFilterable: true,
    variation: [{ field: 'variacion' }],
  },
  {
    id: 'R-PAC-03',
    title: 'Demografía de pacientes',
    description: 'Distribución de pacientes por rango etario y sexo.',
    endpoint: `${BASE}/demografia`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['grupoEtario', 'sexo', 'cantidad'],
    defaultSort: { field: 'grupoEtario', direction: 'ASC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'grupoEtario', header: 'Grupo etario' },
        { field: 'sexo', header: 'Sexo' },
        { field: 'cantidad', header: 'Cantidad', align: 'right' },
      ],
      ['grupoEtario', 'sexo', 'cantidad'],
    ),
    // Pacientes vía atención: el backend YA acepta branchId acá (REP-KIT-06, verificado).
    branchFilterable: true,
  },
  {
    id: 'R-PAC-04',
    title: 'Pacientes por cobertura',
    description: 'Cantidad de pacientes agrupados por obra social/cobertura.',
    endpoint: `${BASE}/por-cobertura`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['cobertura', 'cantidadPacientes'],
    defaultSort: { field: 'cantidadPacientes', direction: 'DESC' },
    filters: [
      {
        key: 'tipoCobertura', label: 'Tipo de cobertura', type: 'select',
        options: [
          { label: 'Con cobertura', value: 'con-cobertura' },
          { label: 'Sin cobertura', value: 'sin-cobertura' },
        ],
      },
      // Antes pedía escribir a mano el ID numérico del plan (indefendible para un
      // gerente). Selector por nombre — opciones resueltas en runtime por ReportPage
      // vía GET /api/v1/coverages/plans (ObraSocialService.listPlansForSelector). El
      // filtro sigue siendo el mismo Long — solo cambia cómo el front obtiene el valor.
      { key: 'plan', label: 'Plan', type: 'select', dynamicOptionsKey: 'planes', options: [] },
    ],
    columns: withSortableColumns(
      [
        { field: 'cobertura', header: 'Cobertura' },
        { field: 'cantidadPacientes', header: 'Pacientes', align: 'right' },
      ],
      ['cobertura', 'cantidadPacientes'],
    ),
    // Join contra atención (D2.1): el backend YA acepta branchId acá.
    branchFilterable: true,
  },
  {
    id: 'R-PAC-05',
    title: 'Pacientes con datos incompletos',
    description: 'Ranking de campos omitidos entre pacientes con datos incompletos.',
    endpoint: `${BASE}/datos-incompletos`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['campo', 'cantidadPacientes'],
    defaultSort: { field: 'cantidadPacientes', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'campo', header: 'Campo' },
        { field: 'cantidadPacientes', header: 'Pacientes', align: 'right' },
        { field: 'porcentaje', header: 'Porcentaje', align: 'right' },
      ],
      ['campo', 'cantidadPacientes'],
    ),
    // Join contra atención (D2.1): el backend YA acepta branchId acá.
    branchFilterable: true,
  },
];
