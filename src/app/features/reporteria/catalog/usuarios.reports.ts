import { ReportDef, withSortableColumns } from '../models/report.model';

const ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];
const BASE = '/api/v1/empresa/reportes/usuarios';

export const USUARIOS_REPORTS: ReportDef[] = [
  {
    id: 'R-USR-01',
    title: 'Usuarios externos',
    description: 'Listado de usuarios externos (portal de pacientes) del tenant.',
    endpoint: `${BASE}/externos`,
    roles: ROLES,
    sortableFields: [
      'id', 'nombre', 'apellido', 'username', 'email', 'documento',
      'emailVerificado', 'primerLoginPendiente', 'ultimoAcceso', 'fechaAlta',
    ],
    defaultSort: { field: 'apellido', direction: 'ASC' },
    filters: [
      { key: 'emailVerified', label: 'Email verificado', type: 'boolean' },
      { key: 'firstLoginPending', label: 'Primer login pendiente', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'apellido', header: 'Apellido' },
        { field: 'nombre', header: 'Nombre' },
        { field: 'username', header: 'Usuario' },
        { field: 'email', header: 'Email' },
        { field: 'documento', header: 'Documento' },
        { field: 'emailVerificado', header: 'Email verificado' },
        { field: 'primerLoginPendiente', header: 'Primer login pendiente' },
        { field: 'ultimoAcceso', header: 'Último acceso' },
        { field: 'fechaAlta', header: 'Fecha de alta' },
      ],
      ['id', 'nombre', 'apellido', 'username', 'email', 'documento',
        'emailVerificado', 'primerLoginPendiente', 'ultimoAcceso', 'fechaAlta'],
    ),
  },
  {
    id: 'R-USR-02',
    title: 'Vínculos usuario-paciente',
    description: 'Vínculos entre usuarios externos y los pacientes que administran.',
    endpoint: `${BASE}/vinculos`,
    roles: ROLES,
    sortableFields: ['id', 'pacienteId', 'vinculo', 'titular', 'estado', 'fechaAlta'],
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
        { field: 'pacienteId', header: 'ID de paciente' },
        { field: 'vinculo', header: 'Vínculo' },
        { field: 'titular', header: 'Titular' },
        { field: 'estado', header: 'Estado' },
        { field: 'fechaAlta', header: 'Fecha de vínculo' },
      ],
      ['id', 'pacienteId', 'vinculo', 'titular', 'estado', 'fechaAlta'],
    ),
  },
  {
    id: 'R-USR-03',
    title: 'Altas de usuarios por período',
    description: 'Usuarios dados de alta en el rango de fechas elegido, interno vs. externo.',
    endpoint: `${BASE}/altas`,
    roles: ROLES,
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
  },
];
