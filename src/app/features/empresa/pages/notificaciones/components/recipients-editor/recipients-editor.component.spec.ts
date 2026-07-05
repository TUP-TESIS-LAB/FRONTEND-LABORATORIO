import { Recipient } from '../../../../models/notificaciones-config.model';
import {
  applyRolesChange,
  applyUserToggle,
  deriveUserRows,
} from './recipients-editor.logic';

/**
 * Nota: el rendering del componente (signal inputs) se cubre con `ng test`; bajo Vitest (JIT)
 * los signal inputs no bindean. Acá testeamos la lógica pura de reconstrucción de recipients,
 * que es el core del editor rol-primero aditivo con exclusiones.
 */
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
      const out = applyUserToggle(recipients, 11, false);
      expect(out).toContainEqual({ type: 'EXCLUDED_USER', ref: '11' });
      expect(out).toContainEqual({ type: 'ROLE', ref: 'EXTRACTOR' });
    });

    it('re-tildar un usuario excluido quita la exclusión', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'EXCLUDED_USER', ref: '11' },
      ];
      expect(applyUserToggle(recipients, 11, true)).toEqual([{ type: 'ROLE', ref: 'EXTRACTOR' }]);
    });

    it('tildar un usuario que no entra por ningún rol lo agrega como USER', () => {
      expect(applyUserToggle([], 99, true)).toEqual([{ type: 'USER', ref: '99' }]);
    });

    it('destildar un usuario USER (sin rol) lo quita de la lista', () => {
      const recipients: Recipient[] = [{ type: 'USER', ref: '99' }];
      expect(applyUserToggle(recipients, 99, false)).toEqual([]);
    });

    it('la exclusión gana: destildar un usuario que también es USER explícito lo excluye', () => {
      const recipients: Recipient[] = [
        { type: 'ROLE', ref: 'EXTRACTOR' },
        { type: 'USER', ref: '20' },
      ];
      const out = applyUserToggle(recipients, 20, false);
      expect(out).toContainEqual({ type: 'EXCLUDED_USER', ref: '20' });
      expect(out.some((r) => r.type === 'USER' && r.ref === '20')).toBe(false);
    });
  });

  describe('deriveUserRows', () => {
    it('con un rol agregado todos los elegibles quedan tildados (precarga)', () => {
      const rows = deriveUserRows(
        [{ type: 'ROLE', ref: 'EXTRACTOR' }],
        [{ id: 11, nombre: 'Ana', tieneAcceso: true }],
      );
      expect(rows).toEqual([{ id: 11, nombre: 'Ana', receives: true, disabled: false }]);
    });

    it('un usuario excluido aparece destildado aunque haya rol', () => {
      const rows = deriveUserRows(
        [{ type: 'ROLE', ref: 'EXTRACTOR' }, { type: 'EXCLUDED_USER', ref: '11' }],
        [{ id: 11, nombre: 'Ana', tieneAcceso: true }],
      );
      expect(rows[0].receives).toBe(false);
    });

    it('marca deshabilitado (bloqueado) al usuario sin acceso', () => {
      const rows = deriveUserRows([], [
        { id: 1, nombre: 'Ana', tieneAcceso: true },
        { id: 2, nombre: 'Beto', tieneAcceso: false },
      ]);
      expect(rows).toEqual([
        { id: 1, nombre: 'Ana', receives: false, disabled: false },
        { id: 2, nombre: 'Beto', receives: false, disabled: true },
      ]);
    });
  });
});
