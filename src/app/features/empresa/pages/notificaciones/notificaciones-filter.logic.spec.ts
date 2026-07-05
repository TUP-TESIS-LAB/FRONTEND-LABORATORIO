import { EventConfig } from '../../models/notificaciones-config.model';
import {
  filterConfigs,
  moduleLabel,
  moduleOptions,
  recipientsSummary,
} from './notificaciones-filter.logic';

const cfg = (over: Partial<EventConfig> = {}): EventConfig => ({
  eventType: 'RESULT_READY',
  title: 'Resultado listo',
  enabled: true,
  hasTrigger: true,
  recipients: [],
  section: 'EXTRACCIONES',
  ...over,
});

describe('notificaciones-filter.logic', () => {
  describe('moduleLabel', () => {
    it('mapea secciones conocidas a español', () => {
      expect(moduleLabel('FINANCIERO')).toBe('Financiero');
      expect(moduleLabel('OBRAS_SOCIALES')).toBe('Obras sociales');
    });

    it('prettifica secciones desconocidas sin leak del código crudo', () => {
      expect(moduleLabel('NUEVO_MODULO')).toBe('Nuevo modulo');
    });

    it('devuelve "Sin módulo" para vacío', () => {
      expect(moduleLabel('')).toBe('Sin módulo');
    });
  });

  describe('moduleOptions', () => {
    it('incluye "Todos" primero y las secciones distintas ordenadas', () => {
      const options = moduleOptions([cfg({ section: 'FINANCIERO' }), cfg({ section: 'EXTRACCIONES' }), cfg({ section: 'FINANCIERO' })]);
      expect(options[0]).toEqual({ label: 'Todos los módulos', value: 'all' });
      expect(options.map((o) => o.value)).toEqual(['all', 'EXTRACCIONES', 'FINANCIERO']);
    });
  });

  describe('filterConfigs', () => {
    const configs = [
      cfg({ eventType: 'A', title: 'Cierre de caja', enabled: true, section: 'FINANCIERO' }),
      cfg({ eventType: 'B', title: 'Resultado listo', enabled: false, section: 'EXTRACCIONES' }),
    ];

    it('solo-activos oculta los deshabilitados', () => {
      expect(filterConfigs(configs, { search: '', module: 'all', status: 'active' }).map((c) => c.eventType)).toEqual(['A']);
    });

    it('búsqueda por título es case-insensitive', () => {
      expect(filterConfigs(configs, { search: 'RESULTADO', module: 'all', status: 'all' }).map((c) => c.eventType)).toEqual(['B']);
    });

    it('filtra por módulo', () => {
      expect(filterConfigs(configs, { search: '', module: 'EXTRACCIONES', status: 'all' }).map((c) => c.eventType)).toEqual(['B']);
    });

    it('combina los tres filtros', () => {
      expect(filterConfigs(configs, { search: 'caja', module: 'FINANCIERO', status: 'active' }).map((c) => c.eventType)).toEqual(['A']);
    });
  });

  describe('recipientsSummary', () => {
    it('resume roles y usuarios', () => {
      expect(recipientsSummary(cfg({ recipients: [{ type: 'ROLE', ref: 'X' }, { type: 'USER', ref: '1' }, { type: 'USER', ref: '2' }] })))
        .toBe('1 rol · 2 usuarios');
    });

    it('anota las exclusiones', () => {
      expect(recipientsSummary(cfg({ recipients: [{ type: 'ROLE', ref: 'X' }, { type: 'EXCLUDED_USER', ref: '1' }] })))
        .toBe('1 rol (−1)');
    });

    it('vacío cuando no hay destinatarios', () => {
      expect(recipientsSummary(cfg({ recipients: [] }))).toBe('');
    });
  });
});
