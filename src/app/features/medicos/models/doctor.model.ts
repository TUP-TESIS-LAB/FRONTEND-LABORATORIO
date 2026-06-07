export type RegistrationType = 'NACIONAL' | 'PROVINCIAL';

export interface DoctorAddress {
  id?: number;
  street: string;
  streetNumber?: string | null;
  cityId?: number | null;
  neighborhoodId?: number | null;
}

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
  active: boolean;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  institution?: string | null;
  signature?: string | null;
  address?: DoctorAddress | null;
}

export interface CreateDoctorRequest {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  institution?: string | null;
  signature?: string | null;
  address?: DoctorAddress | null;
}

export type UpdateDoctorRequest = CreateDoctorRequest;
