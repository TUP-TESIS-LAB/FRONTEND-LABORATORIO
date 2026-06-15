import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MedicoFormDrawerComponent } from './medico-form-drawer.component';
import { CreateDoctorRequest } from '../../../models/doctor.model';

describe('MedicoFormDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicoFormDrawerComponent],
      providers: [provideNoopAnimations()],
    });
  });

  function openDrawer() {
    const fixture = TestBed.createComponent(MedicoFormDrawerComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValid(cmp: MedicoFormDrawerComponent) {
    cmp.form.setValue({
      firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL',
      specialty: '', email: '', phone: '',
    });
  }

  it('emits create with the CreateDoctorRequest on Guardar', () => {
    const fixture = openDrawer();
    const cmp = fixture.componentInstance;
    fillValid(cmp);
    let emitted: CreateDoctorRequest | undefined;
    cmp.create.subscribe((r) => (emitted = r));
    cmp.onSubmit();
    expect(emitted).toEqual({
      firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL',
      specialty: null, email: null, phone: null,
    });
  });

  it('emits createAndNext on "Guardar y agregar otro"', () => {
    const fixture = openDrawer();
    const cmp = fixture.componentInstance;
    fillValid(cmp);
    cmp.form.patchValue({ specialty: 'Cardiología', email: 'ana@x.com', phone: '2211234567' });
    let emitted: CreateDoctorRequest | undefined;
    cmp.createAndNext.subscribe((r) => (emitted = r));
    cmp.onSubmitNext();
    expect(emitted).toEqual({
      firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL',
      specialty: 'Cardiología', email: 'ana@x.com', phone: '2211234567',
    });
  });

  it('does not emit while required fields are missing', () => {
    const fixture = openDrawer();
    const cmp = fixture.componentInstance;
    const spy = vi.fn();
    cmp.create.subscribe(spy);
    cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the form when resetToken changes (post "agregar otro")', () => {
    const fixture = openDrawer();
    const cmp = fixture.componentInstance;
    fillValid(cmp);
    fixture.componentRef.setInput('resetToken', 1);
    fixture.detectChanges();
    expect(cmp.form.get('firstName')!.value).toBe('');
    expect(cmp.form.get('registrationType')!.value).toBe('NACIONAL');
  });

  it('emits cancel when the drawer is dismissed', () => {
    const fixture = openDrawer();
    const cmp = fixture.componentInstance;
    const spy = vi.fn();
    cmp.cancel.subscribe(spy);
    cmp.onVisibleChange(false);
    expect(spy).toHaveBeenCalled();
  });
});
