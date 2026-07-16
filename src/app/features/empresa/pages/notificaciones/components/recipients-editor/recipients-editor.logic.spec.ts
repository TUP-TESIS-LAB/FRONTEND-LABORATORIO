import { EligibleUser, Recipient } from '../../../../models/notificaciones-config.model';
import {
  applyRolesChange,
  applyUserToggle,
  deriveUserRows,
  filterUsers,
  resolveAssigned,
} from './recipients-editor.logic';

/**
 * Lógica pura del editor rol-primero aditivo con exclusiones (KAN-185) + filtros por
 * rol/sucursal/búsqueda y resolución de asignados (KAN-198). El rendering del componente
 * (signal inputs) se cubre aparte; acá sólo las funciones puras.
 */
const u = (id: number, nombre: string, roleCodes: string[], branchId: number | null): EligibleUser => ({
  id,
  nombre,
  tieneAcceso: true,
  roleCodes,
  branchId,
});

describe('recipients-editor logic', () => {
  describe('applyRolesChange', () => {
    it('agregar un rol lo emite como destinatario ROLE', () => {
      expect(applyRolesChange([], ['EXTRACTOR'])).toEqual([{ type: 'ROLE', ref: 'EXTRACTOR' }]);
    });

    it('agregar un rol limpia las exclusiones vigentes (precarga tildados)', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'EXCLUDED_USER', ref: '11' },
      ];
      const out = applyRolesChange(recipients, ['EXTRACTOR', 'ADMINISTRADOR']);
      expect(out.some((r) => r.type === 'EXCLUDED_USER')).toBe(false);
      expect(out).toContainEqual({ type: 'ROLE', ref: 'ADMINISTRADOR' });
    });

    it('quitar el último rol limpia las exclusiones inertes', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'EXCLUDED_USER', ref: '11' },
      ];
      expect(applyRolesChange(recipients, [])).toEqual([]);
    });

    it('quitar uno de varios roles preserva las exclusiones vigentes', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'ROLE', ref: 'ADMINISTRADOR' },
        { type: 'EXCLUDED_USER', ref: '11' },
      ];
      const out = applyRolesChange(recipients, ['EXTRACTOR']);
      expect(out).toContainEqual({ type: 'EXCLUDED_USER', ref: '11' });
      expect(out).toContainEqual({ type: 'ROLE', ref: 'EXTRACTOR' });
    });
  });

  describe('applyUserToggle', () => {
    it('destildar un usuario que entra por rol lo agrega como exclusión', () => {
      const recipients: Recipient[] = [{ type: 'ROLE', ref: 'EXTRACTOR' }];
      const out = applyUserToggle(recipients, u(11, 'Ana', ['EXTRACTOR'], 5), false);
      expect(out).toContainEqual({ type: 'EXCLUDED_USER', ref: '11' });
      expect(out).toContainEqual({ type: 'ROLE', ref: 'EXTRACTOR' });
    });

    it('destildar un usuario que NO tiene el rol agregado lo quita (no lo excluye)', () => {
      const recipients: Recipient[] = [{ type: 'ROLE', ref: 'EXTRACTOR' }, { type: 'USER', ref: '30' }];
      const out = applyUserToggle(recipients, u(30, 'Sin rol', ['SECRETARIA'], 5), false);
      expect(out.some((r) => r.type === 'EXCLUDED_USER')).toBe(false);
      expect(out.some((r) => r.type === 'USER' && r.ref === '30')).toBe(false);
    });

    it('re-tildar un usuario excluido quita la exclusión', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'EXCLUDED_USER', ref: '11' },
      ];
      expect(applyUserToggle(recipients, u(11, 'Ana', ['EXTRACTOR'], 5), true)).toEqual([
        { type: 'ROLE', ref: 'EXTRACTOR' },
      ]);
    });

    it('tildar un usuario que no entra por ningún rol lo agrega como USER', () => {
      expect(applyUserToggle([], u(99, 'Nico', ['SECRETARIA'], 7), true)).toEqual([
        { type: 'USER', ref: '99' },
      ]);
    });

    it('destildar un usuario USER (sin rol) lo quita de la lista', () => {
      const recipients: Recipient[] = [{ type: 'USER', ref: '99' }];
      expect(applyUserToggle(recipients, u(99, 'Nico', ['SECRETARIA'], 7), false)).toEqual([]);
    });

    it('la exclusión gana: destildar un usuario que también es USER explícito lo excluye', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'USER', ref: '20' },
      ];
      const out = applyUserToggle(recipients, u(20, 'Beto', ['EXTRACTOR'], 5), false);
      expect(out).toContainEqual({ type: 'EXCLUDED_USER', ref: '20' });
      expect(out.some((r) => r.type === 'USER' && r.ref === '20')).toBe(false);
    });
  });

  describe('filterUsers', () => {
    it('filtra a los usuarios que tienen el rol agregado', () => {
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5), u(2, 'Beto', ['SECRETARIA'], 5)];
      expect(filterUsers(users, { roleCodes: ['EXTRACTOR'], branchId: null, search: '' }).map((x) => x.id)).toEqual([1]);
    });

    it('sin roles agregados muestra todos', () => {
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5), u(2, 'Beto', ['SECRETARIA'], 7)];
      expect(filterUsers(users, { roleCodes: [], branchId: null, search: '' }).length).toBe(2);
    });

    it('filtra por sucursal', () => {
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5), u(2, 'Ariel', ['EXTRACTOR'], 7)];
      expect(filterUsers(users, { roleCodes: ['EXTRACTOR'], branchId: 5, search: '' }).map((x) => x.id)).toEqual([1]);
    });

    it('filtra por búsqueda (case-insensitive, parcial)', () => {
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5), u(2, 'Ariel', ['EXTRACTOR'], 7)];
      expect(filterUsers(users, { roleCodes: [], branchId: null, search: 'an' }).map((x) => x.id)).toEqual([1]);
    });

    it('combina rol + sucursal + búsqueda', () => {
      const users = [
        u(1, 'Ana', ['EXTRACTOR'], 5),
        u(2, 'Ariel', ['EXTRACTOR'], 7),
        u(3, 'Andrea', ['SECRETARIA'], 5),
      ];
      const out = filterUsers(users, { roleCodes: ['EXTRACTOR'], branchId: 5, search: 'an' });
      expect(out.map((x) => x.id)).toEqual([1]);
    });
  });

  describe('deriveUserRows', () => {
    it('recibe sólo si el user tiene alguno de los roles agregados o es USER', () => {
      const rec: Recipient[] = [{ type: 'ROLE', ref: 'EXTRACTOR' }];
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5), u(2, 'Beto', ['SECRETARIA'], 5)];
      const rows = deriveUserRows(rec, users);
      expect(rows.find((r) => r.id === 1)!.receives).toBe(true);
      expect(rows.find((r) => r.id === 2)!.receives).toBe(false);
    });

    it('un usuario excluido aparece destildado aunque tenga el rol', () => {
      const rows = deriveUserRows(
        [{ type: 'ROLE', ref: 'EXTRACTOR' }, { type: 'EXCLUDED_USER', ref: '1' }],
        [u(1, 'Ana', ['EXTRACTOR'], 5)],
      );
      expect(rows[0].receives).toBe(false);
    });

    it('marca deshabilitado (bloqueado) al usuario sin acceso', () => {
      const rows = deriveUserRows([], [
        { id: 1, nombre: 'Ana', tieneAcceso: true, roleCodes: [], branchId: 5 },
        { id: 2, nombre: 'Beto', tieneAcceso: false, roleCodes: [], branchId: 5 },
      ]);
      expect(rows).toEqual([
        { id: 1, nombre: 'Ana', receives: false, disabled: false },
        { id: 2, nombre: 'Beto', receives: false, disabled: true },
      ]);
    });
  });

  describe('resolveAssigned', () => {
    it('resuelve usuarios de rol − exclusiones + puntuales, con origen', () => {
      const rec: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'EXCLUDED_USER', ref: '1' },
        { type: 'USER', ref: '9' },
      ];
      const users = [
        u(1, 'Ana', ['EXTRACTOR'], 5),
        u(3, 'Cora', ['EXTRACTOR'], 5),
        u(9, 'Nico', ['SECRETARIA'], 7),
      ];
      const a = resolveAssigned(rec, users).map((x) => [x.id, x.viaRole]);
      expect(a).toEqual([[3, true], [9, false]]);
    });

    it('sin roles ni puntuales no asigna a nadie', () => {
      const users = [u(1, 'Ana', ['EXTRACTOR'], 5)];
      expect(resolveAssigned([], users)).toEqual([]);
    });
  });
});
