export type RegistrationType = 'NACIONAL' | 'PROVINCIAL';

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
  active: boolean;
}

export interface CreateDoctorRequest {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
}

export type UpdateDoctorRequest = CreateDoctorRequest;
