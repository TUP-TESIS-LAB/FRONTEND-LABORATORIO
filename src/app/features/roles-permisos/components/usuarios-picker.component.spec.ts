import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuariosPickerComponent } from './usuarios-picker.component';
import { Usuario } from '@features/empresa/models/usuario.model';

const u = (over: Partial<Usuario>): Usuario => ({
  id: 1, firstName: 'Ana', lastName: 'Lopez', username: 'alopez', email: 'a@l.com',
  phone: null, document: '1', isEmailVerified: true, isExternal: false, branch: null,
  isFirstLogin: false, active: true, roles: [], ...over,
});

describe('UsuariosPickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsuariosPickerComponent], providers: [provideNoopAnimations()] });
  });

  it('filtra por texto', () => {
    const fixture = TestBed.createComponent(UsuariosPickerComponent);
    fixture.componentInstance.usuarios = [u({ id: 1, firstName: 'Ana' }), u({ id: 2, firstName: 'Beto', email: 'beto@x.com' })];
    fixture.detectChanges();
    fixture.componentInstance.query.set('beto');
    expect(fixture.componentInstance.filtered().map((x) => x.id)).toEqual([2]);
  });

  it('emite select con el id', () => {
    const fixture = TestBed.createComponent(UsuariosPickerComponent);
    let emitted: number | undefined;
    fixture.componentInstance.select.subscribe((id) => (emitted = id));
    fixture.componentInstance.select.emit(5);
    expect(emitted).toBe(5);
  });
});
