import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { initialAtencionState, ATENCION_FEATURE_KEY } from '../../../../../store/atencion/atencion.state';
import {
  resolvePatientByDni,
  startAttentionForPatient,
  assignGeneralData,
  createPatientInline,
  updatePatientInline,
} from '../../../../../store/atencion/atencion.actions';

describe('DatosGeneralesStepComponent', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({
          initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState },
        }),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('con initialDni despacha resolvePatientByDni al iniciar', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('initialDni', '18901234');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '18901234' }));
  });

  it('confirmar con paciente resuelto y sin atencionId despacha startAttentionForPatient', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      startAttentionForPatient({ patientId: 5, indications: null }),
    );
  });

  it('buscar() despacha resolvePatientByDni con el dni ingresado', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).dniInput = '123';
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.buscar();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '123' }));
  });

  it('onConfirm() con atencionId despacha assignGeneralData', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 7);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any },
    });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(
      assignGeneralData({
        id: 7,
        payload: {
          patientId: 5,
          doctorId: null,
          insurancePlanId: null,
          indications: null,
        },
      }),
    );
  });

  it('crearPaciente() con form válido despacha createPatientInline', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    (fixture.componentInstance as any).form = {
      dni: '12345678',
      firstName: 'Juan',
      lastName: 'Perez',
      birthDate: '1990-05-15',
      gender: 'MALE',
      sexAtBirth: 'MALE',
    };
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).toHaveBeenCalledWith(
      createPatientInline({
        payload: {
          dni: '12345678',
          firstName: 'Juan',
          lastName: 'Perez',
          birthDate: '1990-05-15',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [],
        },
      }),
    );
  });

  it('crearPaciente() con form incompleto no despacha', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState } });
    store.refreshState();
    fixture.detectChanges();
    // form vacío por defecto
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.crearPaciente();
    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Atencion Wizard] Create Patient Inline' }),
    );
  });

  it('saveEdit() despacha updatePatientInline con los datos del form', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({
      [ATENCION_FEATURE_KEY]: {
        ...initialAtencionState,
        resolvedPatient: {
          id: 5,
          dni: '1',
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [],
        } as any,
      },
    });
    store.refreshState();
    fixture.detectChanges();
    fixture.componentInstance.startEdit();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.saveEdit();
    expect(spy).toHaveBeenCalledWith(
      updatePatientInline({
        id: 5,
        payload: {
          firstName: 'A',
          lastName: 'B',
          birthDate: '2000-01-01',
          gender: 'MALE',
          sexAtBirth: 'MALE',
          contacts: [],
          addresses: [],
          coverages: [],
        },
      }),
    );
  });
});
