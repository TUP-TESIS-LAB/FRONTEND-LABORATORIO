import { presetForRole, ROLE_SECTION_PRESETS } from './role-section-presets';

describe('role-section-presets', () => {
  it('SECRETARIA pre-marca recepción/pacientes/agendas/obras sociales', () => {
    expect(ROLE_SECTION_PRESETS['SECRETARIA']).toEqual(
      ['RECEPCION', 'PACIENTES', 'AGENDAS', 'OBRAS_SOCIALES'],
    );
  });

  it('presetForRole intersecta con las grantable', () => {
    const grantable = ['RECEPCION', 'PACIENTES', 'AGENDAS'] as const;
    expect(presetForRole('SECRETARIA', [...grantable])).toEqual(['RECEPCION', 'PACIENTES', 'AGENDAS']);
  });

  it('rol desconocido → preset vacío', () => {
    expect(presetForRole('NO_EXISTE', ['RECEPCION'])).toEqual([]);
  });
});
