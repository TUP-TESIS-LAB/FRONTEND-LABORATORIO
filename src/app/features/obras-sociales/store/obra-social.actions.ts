import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { InsurerComplete } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest, ObraSocialPageResult } from '../models/obra-social-page.model';
import { WizardCreate } from '../models/wizard.model';

// --- Listado (read) ---
export const loadObrasSociales = createAction(
  '[Obras Sociales Page] Load',
  props<{ req: ObraSocialPageRequest }>(),
);
export const loadObrasSocialesSuccess = createAction(
  '[Obras Sociales API] Load Success',
  props<{ result: ObraSocialPageResult }>(),
);
export const loadObrasSocialesFailure = createAction(
  '[Obras Sociales API] Load Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const setObraSocialPageRequest = createAction(
  '[Obras Sociales Page] Set Page Request',
  props<{ patch: Partial<ObraSocialPageRequest> }>(),
);

// --- Detalle (read) ---
export const loadObraSocial = createAction(
  '[Obra Social Detail] Load',
  props<{ id: number }>(),
);
export const loadObraSocialSuccess = createAction(
  '[Obras Sociales API] Load Detail Success',
  props<{ insurer: InsurerComplete }>(),
);
export const loadObraSocialFailure = createAction(
  '[Obras Sociales API] Load Detail Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearSelectedObraSocial = createAction('[Obra Social Detail] Clear Selected');

// --- Alta (submit, exhaustMap) ---
export const createObraSocial = createAction(
  '[Obra Social Form] Create',
  props<{ payload: WizardCreate }>(),
);
export const createObraSocialSuccess = createAction(
  '[Obras Sociales API] Create Success',
  props<{ insurer: InsurerComplete }>(),
);
export const createObraSocialFailure = createAction(
  '[Obras Sociales API] Create Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Catálogos ---
export const loadObraSocialCatalogs = createAction('[Obras Sociales] Load Catalogs');
export const loadObraSocialCatalogsSuccess = createAction(
  '[Obras Sociales API] Load Catalogs Success',
  props<{ insurerTypes: InsurerType[]; nbuVersions: NbuVersion[]; contactTypes: ContactType[] }>(),
);
export const loadObraSocialCatalogsFailure = createAction(
  '[Obras Sociales API] Load Catalogs Failure',
  props<{ error: HttpErrorResponse }>(),
);
