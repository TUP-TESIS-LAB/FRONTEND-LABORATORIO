import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../../../pacientes/models/patient.model';
import {
  AddAnalysisListRequest,
  AddObservationsRequest,
  AddPaymentRequest,
  Analysis,
  AssignGeneralDataRequest,
  AttentionResponse,
  CancelAttentionRequest,
  CreateBlankAttentionRequest,
  CreatePreFilledAttentionRequest,
} from '../../models/atencion.model';
import { AtencionFilters } from './atencion.state';

// List ----------------------------------------------------------------------
export const loadAtenciones        = createAction('[Atencion Dashboard] Load');
export const loadAtencionesSuccess = createAction('[Atencion API] Load Success', props<{ items: AttentionResponse[] }>());
export const loadAtencionesFailure = createAction('[Atencion API] Load Failure', props<{ error: HttpErrorResponse }>());

export const setAtencionFilters = createAction('[Atencion Dashboard] Set Filters', props<{ filters: Partial<AtencionFilters> }>());

// Detail --------------------------------------------------------------------
export const loadAtencion        = createAction('[Atencion Wizard] Load',         props<{ id: number }>());
export const loadAtencionSuccess = createAction('[Atencion API] Load Detail Success', props<{ item: AttentionResponse }>());
export const loadAtencionFailure = createAction('[Atencion API] Load Detail Failure', props<{ error: HttpErrorResponse }>());

// Create --------------------------------------------------------------------
export const createBlankAtencion         = createAction('[Atencion Wizard] Create Blank', props<{ payload: CreateBlankAttentionRequest }>());
export const createPreFilledAtencion     = createAction('[Atencion Wizard] Create Prefilled', props<{ payload: CreatePreFilledAttentionRequest }>());

// Generic mutation result triplet (one Success/Failure for all PATCH actions on detail)
export const atencionMutationSuccess = createAction('[Atencion API] Mutation Success', props<{ item: AttentionResponse }>());
export const atencionMutationFailure = createAction('[Atencion API] Mutation Failure', props<{ error: HttpErrorResponse }>());

// PATCH actions -------------------------------------------------------------
export const assignGeneralData   = createAction('[Atencion Wizard] Assign General Data', props<{ id: number; payload: AssignGeneralDataRequest }>());
export const addAnalysisList     = createAction('[Atencion Wizard] Add Analysis',        props<{ id: number; payload: AddAnalysisListRequest }>());
export const addPayment          = createAction('[Atencion Wizard] Add Payment',         props<{ id: number; payload: AddPaymentRequest }>());
export const endCollection       = createAction('[Atencion Wizard] End Collection',      props<{ id: number }>());
export const endBilling          = createAction('[Atencion Wizard] End Billing',         props<{ id: number }>());
export const endSecretaryPhase   = createAction('[Atencion Wizard] End Secretary Phase', props<{ id: number }>());
export const returnPhase         = createAction('[Atencion Wizard] Return Phase',        props<{ id: number }>());
export const cancelAtencion      = createAction('[Atencion Wizard] Cancel',              props<{ id: number; payload: CancelAttentionRequest }>());
export const addObservations     = createAction('[Atencion Wizard] Add Observations',    props<{ id: number; payload: AddObservationsRequest }>());

// Patient resolution -----------------------------------------------------------
export const resolvePatientByDni      = createAction('[Atencion Wizard] Resolve Patient By Dni',   props<{ dni: string }>());
export const patientResolved          = createAction('[Atencion API] Patient Resolved',             props<{ patient: Patient }>());
export const patientNotFound          = createAction('[Atencion API] Patient Not Found',            props<{ dni: string }>());
export const patientResolutionFailure = createAction('[Atencion API] Patient Resolution Failure',   props<{ error: HttpErrorResponse }>());
export const createPatientInline      = createAction('[Atencion Wizard] Create Patient Inline',     props<{ payload: CreatePatientRequest }>());
export const updatePatientInline      = createAction('[Atencion Wizard] Update Patient Inline',     props<{ id: number; payload: UpdatePatientRequest }>());
export const startAttentionForPatient = createAction('[Atencion Wizard] Start For Patient',         props<{ patientId: number; indications: string | null }>());

// Resumen -----------------------------------------------------------------------
export const loadAttentionPatient = createAction('[Atencion Resumen] Load Patient', props<{ patientId: number }>());

export const loadAttentionAnalyses    = createAction('[Atencion Resumen] Load Analyses', props<{ analysisIds: number[] }>());
export const attentionAnalysesLoaded  = createAction('[Atencion API] Analyses Loaded', props<{ analyses: Analysis[] }>());
export const attentionAnalysesFailure = createAction('[Atencion API] Analyses Failure', props<{ error: HttpErrorResponse }>());
