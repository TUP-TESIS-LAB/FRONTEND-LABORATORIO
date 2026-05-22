import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PatientSearchComponent } from './patient-search.component';
import { PatientService } from '@features/pacientes/services/patient.service';
import { Patient } from '@features/pacientes/models/patient.model';

const sample = (over: Partial<Patient> = {}): Patient => ({
  id: 1, dni: '32456789', firstName: 'Juan', lastName: 'Pérez',
  birthDate: '1985-05-12', gender: 'M', sexAtBirth: 'M',
  isVerified: true, isActive: true, hasGuardian: false,
  guardians: [], addresses: [], contacts: [], coverages: [],
  status: 'ACTIVE', ...over,
} as unknown as Patient);

describe('PatientSearchComponent', () => {
  let fixture: ComponentFixture<PatientSearchComponent>;
  let patientService: { search: ReturnType<typeof vi.fn>; existsByDni: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    patientService = { search: vi.fn(), existsByDni: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PatientSearchComponent],
      providers: [{ provide: PatientService, useValue: patientService }],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientSearchComponent);
    fixture.detectChanges();
  });

  it('searchByDni → emits patientSelected when found', () => {
    const p = sample();
    patientService.search.mockReturnValue(of({ content: [p], totalElements: 1, totalPages: 1, page: 0, size: 1 }));
    const emitted: Patient[] = [];
    fixture.componentInstance.patientSelected.subscribe((v) => emitted.push(v));
    fixture.componentInstance.searchByDni('32456789');
    expect(emitted).toEqual([p]);
  });

  it('searchByDni → emits notFound when no match', () => {
    patientService.search.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 1, page: 0, size: 1 }));
    const emitted: string[] = [];
    fixture.componentInstance.notFound.subscribe((dni) => emitted.push(dni));
    fixture.componentInstance.searchByDni('99999999');
    expect(emitted).toEqual(['99999999']);
  });

  it('searchByDni → emits notFound when items returned but DNI does not match exactly', () => {
    patientService.search.mockReturnValue(of({ content: [sample({ dni: '00000000' })], totalElements: 1, totalPages: 1, page: 0, size: 1 }));
    const emitted: string[] = [];
    fixture.componentInstance.notFound.subscribe((dni) => emitted.push(dni));
    fixture.componentInstance.searchByDni('99999999');
    expect(emitted).toEqual(['99999999']);
  });

  it('clear() resets the loaded patient signal', () => {
    fixture.componentInstance.setPatient(sample());
    expect(fixture.componentInstance.patient()).not.toBeNull();
    fixture.componentInstance.clear();
    expect(fixture.componentInstance.patient()).toBeNull();
  });
});
