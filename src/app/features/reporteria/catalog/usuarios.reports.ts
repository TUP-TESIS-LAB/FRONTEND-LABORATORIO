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
    sortableFields: ['lastName', 'createdAt'],
    defaultSort: { field: 'lastName', direction: 'ASC' },
    filters: [
      { key: 'onlyActive', label: 'Solo activos', type: 'boolean' },
    ],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'email', header: 'Email' },
        { field: 'roleName', header: 'Rol' },
        { field: 'active', header: 'Estado' },
      ],
      ['lastName', 'createdAt'],
    ),
  },
  {
    id: 'R-USR-02',
    title: 'Vínculos usuario-paciente',
    description: 'Vínculos entre usuarios externos y los pacientes que administran.',
    endpoint: `${BASE}/vinculos-paciente`,
    roles: ROLES,
    sortableFields: ['linkedAt'],
    defaultSort: { field: 'linkedAt', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'userLastName', header: 'Usuario (apellido)' },
        { field: 'userFirstName', header: 'Usuario (nombre)' },
        { field: 'patientLastName', header: 'Paciente (apellido)' },
        { field: 'patientFirstName', header: 'Paciente (nombre)' },
        { field: 'patientDni', header: 'DNI paciente' },
        { field: 'linkedAt', header: 'Fecha de vínculo' },
      ],
      ['linkedAt'],
    ),
  },
  {
    id: 'R-USR-03',
    title: 'Altas de usuarios por período',
    description: 'Usuarios externos dados de alta en el rango de fechas elegido.',
    endpoint: `${BASE}/altas`,
    roles: ROLES,
    sortableFields: ['createdAt'],
    defaultSort: { field: 'createdAt', direction: 'DESC' },
    filters: [],
    columns: withSortableColumns(
      [
        { field: 'lastName', header: 'Apellido' },
        { field: 'firstName', header: 'Nombre' },
        { field: 'email', header: 'Email' },
        { field: 'createdAt', header: 'Fecha de alta' },
      ],
      ['createdAt'],
    ),
  },
];
