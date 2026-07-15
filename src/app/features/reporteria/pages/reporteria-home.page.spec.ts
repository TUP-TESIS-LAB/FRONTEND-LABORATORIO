import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { provideRouter } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { ReporteriaHomePage } from './reporteria-home.page';
import { ALL_REPORTS } from '../catalog';

describe('ReporteriaHomePage', () => {
  function create(roles: string[]) {
    TestBed.configureTestingModule({
      imports: [ReporteriaHomePage],
      providers: [
        provideRouter([]),
        { provide: TokenService, useValue: { getRoles: () => roles } },
      ],
    });
    const fixture = TestBed.createComponent(ReporteriaHomePage);
    return fixture.componentInstance;
  }

  it('un rol sin ningún reporte asignado no ve ningún grupo', () => {
    const cmp = create(['EXTRACTOR']);
    expect(cmp['visibleGroups']()).toEqual([]);
  });

  it('RESPONSABLE_SECRETARIA ve solo los grupos/reportes que incluyen ese rol (no los de ADMINISTRADOR-only)', () => {
    const cmp = create(['RESPONSABLE_SECRETARIA']);
    const groups = cmp['visibleGroups']();
    const visibleIds = groups.flatMap((g) => g.reports.map((r) => r.id));

    // pacientes y usuarios externos incluyen RESPONSABLE_SECRETARIA
    expect(visibleIds).toContain('R-PAC-01');
    expect(visibleIds).toContain('R-USR-01');
    // médicos/empleados/sucursales son ADMINISTRADOR-only
    expect(visibleIds).not.toContain('R-MED-01');
    expect(visibleIds).not.toContain('R-EMP-01');
    expect(visibleIds).not.toContain('R-SUC-01');
  });

  it('ADMINISTRADOR ve los 17 reportes', () => {
    const cmp = create(['ADMINISTRADOR']);
    const groups = cmp['visibleGroups']();
    const visibleIds = groups.flatMap((g) => g.reports.map((r) => r.id));
    expect(visibleIds).toHaveLength(ALL_REPORTS.length);
  });
});
