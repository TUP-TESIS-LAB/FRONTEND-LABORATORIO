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
        // Se muestra el NOMBRE, no el id: un reporte gerencial que dice "90013" es ilegible
        // para quien lo lee. El backend resuelve ambos nombres en batch y sigue enviando
        // analysisTypeId/planId para quien los necesite.
        { field: 'analysisTypeName', header: 'Análisis', align: 'left' },
        { field: 'planName', header: 'Plan de cobertura', align: 'left' },
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
        // Nombre en vez de id, por el mismo motivo que en R-ANA-01: el backend ya envía
        // `determinacion` resuelto y el id queda disponible para quien lo necesite.
        { field: 'determinacion', header: 'Determinación', align: 'left' },
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
