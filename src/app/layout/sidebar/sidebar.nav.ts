import { ModuleKey } from '@core/models/module-key.enum';
import { AccessSection } from '@core/access/access.model';

export interface NavBadge { text: string; tone: 'red' | 'green'; }

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;
      path: string;
      badge?: NavBadge;
      chip?: string;
      moduleKey?: ModuleKey;
      roleKey?: string | string[];    // required role(s) to show the item — array = any of them
      sectionKey?: AccessSection;
      exact?: boolean;     // routerLinkActive exact match — útil para paths padre que tienen sub-rutas en el mismo nav
    }
  | {
      kind: 'external';
      label: string;
      icon: string;
      href: string;        // URL absoluta o ruta fuera del admin-shell; abre en nueva pestaña
      chip?: string;
    }
  | {
      kind: 'expandable';
      label: string;
      icon: string;
      moduleKey?: ModuleKey;   // gate del grupo entero por módulo activable
      sectionKey?: AccessSection; // gate del grupo entero por sección de acceso
      // `external: true` → el hijo abre en pestaña nueva (href = path), como los items
      // `kind: 'external'`. Permite agrupar pantallas externas dentro de un desplegable.
      // `roleKey` gatea el hijo por rol (p. ej. config solo para ADMINISTRADOR).
      children: { label: string; path: string; icon?: string; sectionKey?: AccessSection; roleKey?: string | string[]; external?: boolean }[];
    };

export interface NavSection { label: string; items: NavItem[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Recepción',
    items: [
      { kind: 'link', label: 'Recepción', icon: 'pi pi-bell', path: '/turnos/recepcion', sectionKey: 'RECEPCION' },
      { kind: 'link', label: 'Sacar turno', icon: 'pi pi-calendar-clock', path: '/turnos/sacar', moduleKey: ModuleKey.Turnos, sectionKey: 'RECEPCION' },
      {
        kind: 'link', label: 'Flujo operativo', icon: 'pi pi-chart-bar', path: '/turnos/dashboard',
        moduleKey: ModuleKey.Turnos, sectionKey: 'RECEPCION', roleKey: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      { kind: 'link', label: 'Configuración de agendas', icon: 'pi pi-calendar-plus', path: '/turnos/configuracion', moduleKey: ModuleKey.Turnos, sectionKey: 'AGENDAS' },
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos', sectionKey: 'MEDICOS' },
    ],
  },
  {
    label: 'Clínico',
    items: [
      {
        kind: 'expandable', label: 'Muestras', icon: 'pi pi-clipboard',
        children: [
          { label: 'Recolección',   path: '/analitica/recoleccion',   icon: 'pi pi-inbox',        sectionKey: 'PREANALITICA' },
          { label: 'Traslado',      path: '/analitica/traslado',      icon: 'pi pi-truck',        sectionKey: 'PREANALITICA' },
          { label: 'Procesamiento', path: '/analitica/procesamiento', icon: 'pi pi-cog',          sectionKey: 'ANALITICA' },
          { label: 'Validación',    path: '/analitica/validacion',    icon: 'pi pi-check-circle', sectionKey: 'ANALITICA' },
          { label: 'Descarte',      path: '/analitica/descarte',      icon: 'pi pi-trash',        sectionKey: 'POSTANALITICA' },
        ],
      },
      { kind: 'link', label: 'Cola de extracción', icon: 'pi pi-bolt', path: '/analitica/extraccion', sectionKey: 'EXTRACCIONES' },
      { kind: 'link', label: 'Nomenclador NBU', icon: 'pi pi-book', path: '/analitica/nbu', sectionKey: 'ANALITICA' },
      // sectionKey único de gate: la página en sí también filtra tabs individuales
      // por PREANALITICA/POSTANALITICA (`AnaliticaDashboardPage`) — el ítem del menú
      // solo necesita al menos una sección de Analítica habilitada, y ANALITICA es la
      // tab por defecto (ver design.md "Dashboards de métricas").
      { kind: 'link', label: 'Métricas', icon: 'pi pi-chart-bar', path: '/analitica/metricas', sectionKey: 'ANALITICA' },
      { kind: 'link', label: 'Urgentes en curso', icon: 'pi pi-clock', path: '/urgencias/en-curso', moduleKey: ModuleKey.Urgencias },
    ],
  },
  {
    label: 'Domicilio',
    items: [
      { kind: 'link', label: 'Extracción a domicilio', icon: 'pi pi-home', path: '/domicilio/agenda', moduleKey: ModuleKey.Domicilio, sectionKey: 'DOMICILIO' },
      { kind: 'link', label: 'Mi ruta del día', icon: 'pi pi-map', path: '/domicilio/mi-ruta', moduleKey: ModuleKey.Domicilio, sectionKey: 'DOMICILIO_RUTA', roleKey: 'EXTRACTOR' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building', path: '/empresa', sectionKey: 'EMPRESA' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-building', path: '/sucursales', sectionKey: 'SUCURSALES' },
      { kind: 'link', label: 'Obras sociales',   icon: 'pi pi-id-card',  path: '/obras-sociales', sectionKey: 'OBRAS_SOCIALES' },
      {
        kind: 'expandable', label: 'Financiero', icon: 'pi pi-wallet',
        moduleKey: ModuleKey.Financiero, sectionKey: 'FINANCIERO',
        children: [
          { label: 'Dashboard',       path: '/financiero/dashboard',       icon: 'pi pi-chart-bar',        roleKey: 'ADMINISTRADOR' },
          // Operativo / diario
          { label: 'Caja',            path: '/financiero/caja',            icon: 'pi pi-wallet' },
          { label: 'Cobros',          path: '/financiero/cobros',          icon: 'pi pi-receipt' },
          { label: 'Liquidaciones',   path: '/financiero/liquidaciones',   icon: 'pi pi-chart-line' },
          { label: 'Sucursales',      path: '/financiero/sucursales',      icon: 'pi pi-sitemap' },
          // Configuración (roles altos)
          { label: 'Cajas',           path: '/financiero/subcajas',        icon: 'pi pi-database',         roleKey: 'ADMINISTRADOR' },
          { label: 'Cuentas destino', path: '/financiero/cuentas-destino', icon: 'pi pi-building-columns', roleKey: 'ADMINISTRADOR' },
          { label: 'Config fiscal',   path: '/financiero/config-fiscal',   icon: 'pi pi-verified',         roleKey: 'SAAS_ADMIN' },
        ],
      },
      { kind: 'link', label: 'Stock e insumos',  icon: 'pi pi-box',      path: '/stock', moduleKey: ModuleKey.Stock, sectionKey: 'STOCK' },
      // roleKey = unión de roles con al menos un reporte en el catálogo (ver
      // reporteria.routes.ts REPORTERIA_ROLES); el gate fino por reporte lo hace
      // la propia página de índice al listar solo los reportes del rol del usuario.
      { kind: 'link', label: 'Reportes', icon: 'pi pi-chart-line', path: '/reporteria', roleKey: ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'] },
      // Sin sectionKey ni roleKey: todo el staff tiene que poder leer el manual.
      // El recorte por secciones lo hace la propia pantalla sobre su contenido.
      { kind: 'link', label: 'Manual de uso', icon: 'pi pi-book', path: '/ayuda' },
    ],
  },
];
