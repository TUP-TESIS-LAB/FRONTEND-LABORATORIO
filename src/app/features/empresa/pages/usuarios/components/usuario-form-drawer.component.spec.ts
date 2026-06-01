import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuarioFormDrawerComponent } from './usuario-form-drawer.component';
import { Rol } from '../../../models/rol.model';
import { SectionResponse } from '@core/access/access.model';

const ROLES: Rol[] = [
  { id: 2, code: 'SECRETARIA', description: 'Secretaría', hierarchy: 1 },
  { id: 5, code: 'BIOQUIMICO', description: 'Bioquímico', hierarchy: 2 },
];
const CATALOG: SectionResponse[] = [
  { code: 'ATENCION', label: 'Atención' }, { code: 'PACIENTES', label: 'Pacientes' },
  { code: 'TURNOS', label: 'Turnos' }, { code: 'OBRAS_SOCIALES', label: 'Obras Sociales' },
  { code: 'ANALITICA', label: 'Analítica' },
];

function build() {
  TestBed.configureTestingModule({ imports: [UsuarioFormDrawerComponent], providers: [provideNoopAnimations()] });
  const fixture = TestBed.createComponent(UsuarioFormDrawerComponent);
  fixture.componentRef.setInput('roles', ROLES);
  fixture.componentRef.setInput('catalog', CATALOG);
  fixture.componentRef.setInput('initialSections', []);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
  return { fixture, comp: fixture.componentInstance as any };
}

describe('UsuarioFormDrawerComponent', () => {
  it('al elegir un rol, aplica su preset ∩ catálogo al workingSet', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    expect(comp.workingSet()).toEqual(['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES']);
  });

  it('cambiar de rol reemplaza el preset', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    comp.onRoleChange(5);
    expect(comp.workingSet()).toEqual(['ANALITICA', 'PACIENTES']);
  });

  it('toggle agrega/saca una sección', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    comp.onToggleSection('ATENCION');
    expect(comp.workingSet()).not.toContain('ATENCION');
    comp.onToggleSection('ANALITICA');
    expect(comp.workingSet()).toContain('ANALITICA');
  });

  it('submit emite el payload con roleIds:[rol] y sections=workingSet', () => {
    const { comp } = build();
    comp.form.patchValue({ firstName: 'M', lastName: 'G', email: 'm@l.com', document: '1', username: 'mg' });
    comp.onRoleChange(2);
    let emitted: any = null;
    comp.create.subscribe((p: any) => (emitted = p));
    comp.onSubmit();
    expect(emitted.roleIds).toEqual([2]);
    expect(emitted.sections).toEqual(['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES']);
  });

  it('el form es válido sin rol (rol opcional)', () => {
    const { comp } = build();
    comp.form.patchValue({ firstName: 'M', lastName: 'G', email: 'm@l.com', document: '1', username: 'mg' });
    // sin setear roleId
    expect(comp.canSubmit()).toBe(true);
  });
});
