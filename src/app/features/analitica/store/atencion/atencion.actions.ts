import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../../../pacientes/models/patient.model';
import { PatientGuardian } from '../../models/patient-guardian.model';
import { RegisterGuardianBody } from '../../services/family-link.service';
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
import { AttentionPricing } from '../../models/pricing.model';
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

// Wizard state reset --------------------------------------------------------
export const resetAtencionWizard = createAction('[Atencion Wizard] Reset Wizard State');

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
export const startAttentionForPatient = createAction('[Atencion Wizard] Start For Patient',         props<{ patientId: number; doctorId: number | null; insurancePlanId: number | null; indications: string | null; queueEntryId: number | null }>());

// Patient verification (KAN-86) -------------------------------------------------
export const verifyPatient        = createAction('[Atencion Wizard] Verify Patient',         props<{ id: number }>());
export const verifyPatientSuccess = createAction('[Atencion API] Verify Patient Success',    props<{ patient: Patient }>());
export const verifyPatientFailure = createAction('[Atencion API] Verify Patient Failure',    props<{ error: HttpErrorResponse }>());

// Rotulos -----------------------------------------------------------------------
export const downloadProtocolLabels = createAction('[Atencion Rotulos] Download Protocol Labels', props<{ protocolId: number; protocolNumber: string }>());

// Resumen -----------------------------------------------------------------------
export const loadAttentionPatient = createAction('[Atencion Resumen] Load Patient', props<{ patientId: number }>());

export const loadAttentionAnalyses    = createAction('[Atencion Resumen] Load Analyses', props<{ analysisIds: number[] }>());
export const attentionAnalysesLoaded  = createAction('[Atencion API] Analyses Loaded', props<{ analyses: Analysis[] }>());
export const attentionAnalysesFailure = createAction('[Atencion API] Analyses Failure', props<{ error: HttpErrorResponse }>());

// Pricing -----------------------------------------------------------------------
export const loadPricing        = createAction('[Atencion Resumen] Load Pricing',         props<{ attentionId: number }>());
export const loadPricingSuccess = createAction('[Atencion API] Load Pricing Success',     props<{ pricing: AttentionPricing }>());
export const loadPricingFailure = createAction('[Atencion API] Load Pricing Failure',     props<{ error: HttpErrorResponse }>());

// Copayment ---------------------------------------------------------------------
export const setCopayment        = createAction('[Atencion Resumen] Set Copayment',        props<{ attentionId: number; copaymentAmount: number | null }>());
export const setCopaymentSuccess = createAction('[Atencion API] Set Copayment Success',   props<{ item: AttentionResponse }>());
export const setCopaymentFailure = createAction('[Atencion API] Set Copayment Failure',   props<{ error: HttpErrorResponse }>());

// Authorization number ----------------------------------------------------------
export const setAuthorizationNumber        = createAction('[Atencion Resumen] Set Authorization Number',     props<{ attentionId: number; authorizationNumber: string | null }>());
export const setAuthorizationNumberSuccess = createAction('[Atencion API] Set Authorization Number Success', props<{ item: AttentionResponse }>());
export const setAuthorizationNumberFailure = createAction('[Atencion API] Set Authorization Number Failure', props<{ error: HttpErrorResponse }>());

// Urgent flag (KAN-140) — marca urgente desde recepción (gateado por URGENCIAS) -
export const setUrgentFlag        = createAction('[Atencion Wizard] Set Urgent Flag',        props<{ id: number; isUrgent: boolean }>());
export const setUrgentFlagSuccess = createAction('[Atencion API] Set Urgent Flag Success',   props<{ item: AttentionResponse }>());
export const setUrgentFlagFailure = createAction('[Atencion API] Set Urgent Flag Failure',   props<{ error: HttpErrorResponse }>());

// Advance urgent (KAN-140) — modo express: salta cobro/facturación/confirmación y manda a extracción -
export const advanceUrgent        = createAction('[Atencion Wizard] Advance Urgent',         props<{ id: number }>());
export const advanceUrgentSuccess = createAction('[Atencion API] Advance Urgent Success',    props<{ item: AttentionResponse }>());
export const advanceUrgentFailure = createAction('[Atencion API] Advance Urgent Failure',    props<{ error: HttpErrorResponse }>());

// Remove analysis from resumen (B3c) -------------------------------------------
export const removeAnalysisFromResumen = createAction(
  '[Atencion Resumen] Remove Analysis',
  props<{ attentionId: number; analysisId: number; payload: AddAnalysisListRequest }>()
);
export const removeAnalysisFromResumenSuccess = createAction(
  '[Atencion API] Remove Analysis From Resumen Success',
  props<{ item: AttentionResponse }>()
);
export const removeAnalysisFromResumenFailure = createAction(
  '[Atencion API] Remove Analysis From Resumen Failure',
  props<{ error: HttpErrorResponse }>()
);

// Family link (guardians / vínculo familiar) ------------------------------------
export const loadPatientGuardians        = createAction('[Atencion Wizard] Load Patient Guardians',         props<{ patientId: number }>());
export const loadPatientGuardiansSuccess = createAction('[Atencion API] Load Patient Guardians Success',    props<{ guardians: PatientGuardian[] }>());
export const loadPatientGuardiansFailure = createAction('[Atencion API] Load Patient Guardians Failure',    props<{ error: HttpErrorResponse }>());

export const validateBond        = createAction('[Atencion Wizard] Validate Bond',         props<{ userPatientId: number; status: 'VERIFIED' | 'REJECTED' }>());
export const validateBondSuccess = createAction('[Atencion API] Validate Bond Success',    props<{ userPatientId: number; status: 'VERIFIED' | 'REJECTED' }>());
export const validateBondFailure = createAction('[Atencion API] Validate Bond Failure',    props<{ error: HttpErrorResponse }>());

export const registerGuardian        = createAction('[Atencion Wizard] Register Guardian',         props<RegisterGuardianBody>());
export const registerGuardianSuccess = createAction('[Atencion API] Register Guardian Success',    props<{ patientId: number }>());
export const registerGuardianFailure = createAction('[Atencion API] Register Guardian Failure',    props<{ error: HttpErrorResponse }>());
