import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['BIOQUIMICO', 'ADMINISTRADOR'];
const BASE = '/api/v1/analitica/reportes';

export const ANALITICA_REPORTS: ReportDef[] = [
  {
    id: 'R-ANA-01',
    title: 'Estadísticas por análisis con cobertura',
    description: 'Cantidad de determinaciones por análisis, cobertura y período.',
    endpoint: `${BASE}/estadisticas-cobertura`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['year', 'month', 'count'],
    defaultSort: { field: 'year', direction: 'DESC' },
    dateRange: { fromKey: 'dateFrom', toKey: 'dateTo' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'analysisTypeId', header: 'Análisis (catálogo)', align: 'right' },
        { field: 'planId', header: 'Plan de cobertura', align: 'right' },
        { field: 'year', header: 'Año', align: 'right' },
        { field: 'month', header: 'Mes', align: 'right' },
        { field: 'count', header: 'Cantidad', align: 'right' },
      ],
      ['year', 'month', 'count'],
    ),
    branchFilterable: true,
  },
  {
    id: 'R-ANA-02',
    title: 'Determinaciones corregidas',
    description: 'Determinaciones con más de una carga registrada en el rango.',
    endpoint: `${BASE}/correcciones-determinaciones`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['cantidadCargas', 'ultimaCarga'],
    defaultSort: { field: 'ultimaCarga', direction: 'DESC' },
    dateRange: { fromKey: 'dateFrom', toKey: 'dateTo' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'determinationId', header: 'Determinación', align: 'right' },
        { field: 'analyticalResultId', header: 'Resultado analítico', align: 'right' },
        { field: 'cantidadCargas', header: 'Cantidad de cargas', align: 'right' },
        { field: 'primeraCarga', header: 'Primera carga', type: 'date' },
        { field: 'ultimaCarga', header: 'Última carga', type: 'date' },
      ],
      ['cantidadCargas', 'ultimaCarga'],
    ),
    branchFilterable: true,
  },
];
