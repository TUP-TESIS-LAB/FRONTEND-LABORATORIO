import { presetForRole, ROLE_SECTION_PRESETS } from './role-section-presets';

describe('role-section-presets', () => {
  it('SECRETARIA pre-marca atención/pacientes/turnos/obras sociales', () => {
    expect(ROLE_SECTION_PRESETS['SECRETARIA']).toEqual(
      ['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES'],
    );
  });

  it('presetForRole intersecta con las grantable', () => {
    const grantable = ['ATENCION', 'PACIENTES', 'TURNOS'] as const;
    expect(presetForRole('SECRETARIA', [...grantable])).toEqual(['ATENCION', 'PACIENTES', 'TURNOS']);
  });

  it('rol desconocido → preset vacío', () => {
    expect(presetForRole('NO_EXISTE', ['ATENCION'])).toEqual([]);
  });
});
