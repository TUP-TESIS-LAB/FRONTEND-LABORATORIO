import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { UsuarioStepComponent } from './usuario-step.component';
import { RolesApiService } from '@features/empresa/services/roles-api.service';
import { RolesPermisosApiService } from '@features/roles-permisos/services/roles-permisos-api.service';
import { UsuariosApiService } from '@features/empresa/services/usuarios-api.service';
import { SucursalService } from '@features/sucursales/services/sucursal.service';

function buildUsuarioGroup(): FormGroup {
  const fb = new FormBuilder();
  return fb.group({
    mode: ['new'],
    existingUserId: [null],
    newUser: fb.group({
      firstName: [''], lastName: [''], email: ['', Validators.email],
      username: [''], document: [''], roleId: [null], branchId: [null],
    }),
    sections: [[]],
  });
}

describe('UsuarioStepComponent (precarga de usuario nuevo)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuarioStepComponent],
      providers: [
        provideNoopAnimations(),
        { provide: RolesApiService, useValue: { list: () => of([]) } },
        { provide: RolesPermisosApiService, useValue: { getGrantable: () => of([]) } },
        { provide: UsuariosApiService, useValue: { search: () => of({ content: [] }) } },
        { provide: SucursalService, useValue: { list: () => of({ content: [] }) } },
      ],
    });
  });

  it('precarga nombre/apellido/documento desde identity cuando el modo es "new" (email vacío)', () => {
    const group = buildUsuarioGroup();
    const fixture = TestBed.createComponent(UsuarioStepComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('mode', 'new');
    fixture.componentRef.setInput('identity', { firstName: 'Eva', lastName: 'Ruiz', document: '30111222' });
    fixture.detectChanges();

    const nu = group.get('newUser') as FormGroup;
    expect(nu.get('firstName')!.value).toBe('Eva');
    expect(nu.get('lastName')!.value).toBe('Ruiz');
    expect(nu.get('document')!.value).toBe('30111222');
    expect(nu.get('email')!.value).toBe('');
  });

  it('no pisa un campo del usuario que el operador ya editó (dirty)', () => {
    const group = buildUsuarioGroup();
    const nu = group.get('newUser') as FormGroup;
    nu.get('document')!.setValue('99999999');
    nu.get('document')!.markAsDirty();

    const fixture = TestBed.createComponent(UsuarioStepComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('mode', 'new');
    fixture.componentRef.setInput('identity', { firstName: 'Eva', lastName: 'Ruiz', document: '30111222' });
    fixture.detectChanges();

    expect(nu.get('document')!.value).toBe('99999999'); // editado a mano: no se pisa
    expect(nu.get('firstName')!.value).toBe('Eva');     // pristine: se precarga
  });

  it('no precarga si el modo no es "new"', () => {
    const group = buildUsuarioGroup();
    group.get('mode')!.setValue('none');
    const fixture = TestBed.createComponent(UsuarioStepComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('mode', 'none');
    fixture.componentRef.setInput('identity', { firstName: 'Eva', lastName: 'Ruiz', document: '30111222' });
    fixture.detectChanges();

    const nu = group.get('newUser') as FormGroup;
    expect(nu.get('firstName')!.value).toBe('');
  });
});
