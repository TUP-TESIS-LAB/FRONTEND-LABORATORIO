// src/app/features/pacientes/models/patient.model.ts
export type PatientStatus = 'MIN' | 'COMPLETE' | 'VERIFIED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
export type SexAtBirth = 'MALE' | 'FEMALE' | 'INTERSEX';
export type ContactType = 'EMAIL' | 'PHONE' | 'MOBILE';

export interface Contact {
  id?: number;
  contactValue: string;
  contactType: ContactType;
  isPrimary: boolean;
  active: boolean;
}

export interface Address {
  id?: number;
  city?: string;
  province?: string;
  street?: string;
  streetNumber?: string;
  apartment?: string;
  neighborhood?: string;
  zipCode?: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Coverage {
  id?: number;
  planId: number;
  memberNumber: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Patient {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null; // ISO yyyy-MM-dd
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  status: PatientStatus;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
  active: boolean;
}

export interface CreatePatientRequest {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
}

export type UpdatePatientRequest = Omit<CreatePatientRequest, 'dni'>;
