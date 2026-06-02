import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection, SectionResponse } from '@core/access/access.model';

export const loadCatalog = createAction('[RP Page] Load Catalog');
export const loadCatalogSuccess = createAction('[RP API] Load Catalog Success', props<{ catalog: SectionResponse[] }>());
export const loadCatalogFailure = createAction('[RP API] Load Catalog Failure', props<{ error: HttpErrorResponse }>());

export const selectUser = createAction('[RP Page] Select User', props<{ userId: number }>());
export const loadUserSections = createAction('[RP] Load User Sections', props<{ userId: number }>());
export const loadUserSectionsSuccess = createAction('[RP API] Load User Sections Success', props<{ sections: AccessSection[] }>());
export const loadUserSectionsFailure = createAction('[RP API] Load User Sections Failure', props<{ error: HttpErrorResponse }>());

export const toggleSection = createAction('[RP Page] Toggle Section', props<{ code: AccessSection }>());

export const saveUserSections = createAction('[RP Page] Save User Sections');
export const saveUserSectionsSuccess = createAction('[RP API] Save User Sections Success', props<{ sections: AccessSection[] }>());
export const saveUserSectionsFailure = createAction('[RP API] Save User Sections Failure', props<{ error: HttpErrorResponse }>());
