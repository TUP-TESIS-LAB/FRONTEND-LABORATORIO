import { Patient } from '@features/pacientes/models/patient.model';
import { SlotDisponible, TipoAnalisis } from '../models/sacar-turno.model';

export const SACAR_TURNO_FEATURE_KEY = 'sacarTurno';

export interface SacarTurnoState {
  tipos: TipoAnalisis[];
  tiposLoading: boolean;

  branches: Array<{ id: number; name: string }>;
  branchesLoading: boolean;

  slots: SlotDisponible[];
  slotsLoading: boolean;

  creatingPatient: boolean;
  createdPatient: Patient | null;

  booking: boolean;
  bookedId: number | null;

  error: unknown | null;
}

export const initialSacarTurnoState: SacarTurnoState = {
  tipos: [],
  tiposLoading: false,
  branches: [],
  branchesLoading: false,
  slots: [],
  slotsLoading: false,
  creatingPatient: false,
  createdPatient: null,
  booking: false,
  bookedId: null,
  error: null,
};
