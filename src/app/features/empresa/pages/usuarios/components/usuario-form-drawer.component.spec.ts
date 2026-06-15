import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuarioFormDrawerComponent } from './usuario-form-drawer.component';
import { Rol } from '../../../models/rol.model';
import { SectionResponse } from '@core/access/access.model';
import { Sucursal } from '@features/sucursales/models/sucursal.model';

const ROLES: Rol[] = [
  { id: 2, code: 'SECRETARIA', description: 'Secretaría', hierarchy: 1 },
  { id: 5, code: 'BIOQUIMICO', description: 'Bioquímico', hierarchy: 2 },
];
const CATALOG: SectionResponse[] = [
  { code: 'RECEPCION', label: 'Recepción' }, { code: 'PACIENTES', label: 'Pacientes' },
  { code: 'AGENDAS', label: 'Agendas' }, { code: 'OBRAS_SOCIALES', label: 'Obras Sociales' },
  { code: 'ANALITICA', label: 'Analítica' },
];
const BRANCHES: Sucursal[] = [
  { id: 1, code: 'S1', description: 'Central', status: 'ACTIVE', address: null, responsibleUserId: null, active: true, atencionBoxesCount: 0, extraccionBoxesCount: 0 },
  { id: 2, code: 'S2', description: 'Norte', status: 'ACTIVE', address: null, responsibleUserId: null, active: true, atencionBoxesCount: 0, extraccionBoxesCount: 0 },
];

function build(usuario: any = null) {
  TestBed.configureTestingModule({ imports: [UsuarioFormDrawerComponent], providers: [provideNoopAnimations()] });
  const fixture = TestBed.createComponent(UsuarioFormDrawerComponent);
  fixture.componentRef.setInput('roles', ROLES);
  fixture.componentRef.setInput('catalog', CATALOG);
  fixture.componentRef.setInput('branches', BRANCHES);
  fixture.componentRef.setInput('initialSections', []);
  fixture.componentRef.setInput('usuario', usuario);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
  return { fixture, comp: fixture.componentInstance as any };
}

function fillRequired(comp: any) {
  comp.form.patchValue({ firstName: 'M', lastName: 'G', email: 'm@l.com', document: '1', username: 'mg', branchId: 1 });
}

describe('UsuarioFormDrawerComponent', () => {
  it('al elegir un rol, aplica su preset ∩ catálogo al workingSet', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    expect(comp.workingSet()).toEqual(['RECEPCION', 'PACIENTES', 'AGENDAS', 'OBRAS_SOCIALES']);
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
    comp.onToggleSection('RECEPCION');
    expect(comp.workingSet()).not.toContain('RECEPCION');
    comp.onToggleSection('ANALITICA');
    expect(comp.workingSet()).toContain('ANALITICA');
  });

  it('submit emite el payload con roleIds:[rol], sections=workingSet y branchId', () => {
    const { comp } = build();
    fillRequired(comp);
    comp.onRoleChange(2);
    let emitted: any = null;
    comp.create.subscribe((p: any) => (emitted = p));
    comp.onSubmit();
    expect(emitted.roleIds).toEqual([2]);
    expect(emitted.sections).toEqual(['RECEPCION', 'PACIENTES', 'AGENDAS', 'OBRAS_SOCIALES']);
    expect(emitted.branchId).toBe(1);
  });

  it('el form es válido sin rol (rol opcional) cuando hay sucursal', () => {
    const { comp } = build();
    fillRequired(comp);
    // sin setear roleId
    expect(comp.canSubmit()).toBe(true);
  });

  it('la sucursal es obligatoria: sin branchId el form es inválido y no emite', () => {
    const { comp } = build();
    comp.form.patchValue({ firstName: 'M', lastName: 'G', email: 'm@l.com', document: '1', username: 'mg' });
    expect(comp.canSubmit()).toBe(false);
    let emitted: any = null;
    comp.create.subscribe((p: any) => (emitted = p));
    comp.onSubmit();
    expect(emitted).toBeNull();
  });

  it('en edición precarga la sucursal del usuario', () => {
    const { comp } = build({
      id: 7, firstName: 'A', lastName: 'B', username: 'ab', email: 'a@b.com',
      document: '9', branch: 2, roles: [], phone: null, isEmailVerified: false,
      isExternal: false, isFirstLogin: false, active: true,
    });
    expect(comp.form.getRawValue().branchId).toBe(2);
  });
});
