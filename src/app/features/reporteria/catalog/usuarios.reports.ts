import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];
const BASE = '/api/v1/empresa/reportes/usuarios';

export const USUARIOS_REPORTS: ReportDef[] = [
  {
    id: 'R-USR-02',
    title: 'Vínculos usuario-paciente',
    description: 'Vínculos entre usuarios externos y los pacientes que administran.',
    endpoint: `${BASE}/vinculos`,
    roles: ROLES,
    // 'pacienteId' salió de sortableFields junto con la columna (D6) — no le sirve a
    // un operario, y sin columna no tiene sentido dejarlo ordenable.
    sortableFields: ['id', 'vinculo', 'titular', 'estado', 'fechaAlta'],
    defaultSort: { field: 'fechaAlta', direction: 'DESC' },
    filters: [
      {
        key: 'bond', label: 'Vínculo', type: 'select',
        options: [
          { label: 'Propio', value: 'PROPIO' },
          { label: 'Madre', value: 'MADRE' },
          { label: 'Padre', value: 'PADRE' },
          { label: 'Hermano', value: 'HERMANO' },
          { label: 'Hermana', value: 'HERMANA' },
          { label: 'Hijo', value: 'HIJO' },
          { label: 'Hija', value: 'HIJA' },
          { label: 'Tutor', value: 'TUTOR' },
          { label: 'Otros', value: 'OTROS' },
        ],
      },
      {
        key: 'status', label: 'Estado', type: 'select',
        options: [
          { label: 'Creado', value: 'CREATED' },
          { label: 'Verificado', value: 'VERIFIED' },
          { label: 'Rechazado', value: 'REJECTED' },
        ],
      },
      { key: 'owner', label: 'Solo titulares', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'username', header: 'Usuario' },
        { field: 'email', header: 'Email' },
        { field: 'vinculo', header: 'Vínculo' },
        { field: 'titular', header: 'Titular', type: 'boolean' },
        { field: 'estado', header: 'Estado' },
        { field: 'fechaAlta', header: 'Fecha de vínculo', type: 'date' },
      ],
      ['id', 'vinculo', 'titular', 'estado', 'fechaAlta'],
    ),
  },
  {
    id: 'R-USR-03',
    title: 'Altas de usuarios por período',
    description: 'Usuarios dados de alta en el rango de fechas elegido, interno vs. externo.',
    endpoint: `${BASE}/altas`,
    roles: ROLES,
    searchKey: null,
    sortableFields: ['periodo', 'altasInternas', 'altasExternas', 'total'],
    defaultSort: { field: 'periodo', direction: 'ASC' },
    filters: [
      { key: 'isExternal', label: 'Solo externos', type: 'boolean' },
      {
        key: 'granularity', label: 'Granularidad', type: 'select',
        options: [
          { label: 'Mensual', value: 'MONTH' },
          { label: 'Anual', value: 'YEAR' },
        ],
      },
    ],
    columns: withSortableColumns(
      [
        { field: 'periodo', header: 'Período' },
        { field: 'altasInternas', header: 'Altas internas', align: 'right' },
        { field: 'altasExternas', header: 'Altas externas', align: 'right' },
        { field: 'total', header: 'Total', align: 'right' },
      ],
      ['periodo', 'altasInternas', 'altasExternas', 'total'],
    ),
    // Serie temporal (D3/D4). Tres métricas por fila (internas/externas/total) → tres columnas.
    variation: [
      { field: 'variacionInternas', header: 'Var. internas' },
      { field: 'variacionExternas', header: 'Var. externas' },
      { field: 'variacionTotal', header: 'Var. total' },
    ],
  },
];
