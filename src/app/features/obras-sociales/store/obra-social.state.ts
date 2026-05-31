import { HttpErrorResponse } from '@angular/common/http';
import { InsurerComplete, InsurerSummary } from '../models/insurer.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest } from '../models/obra-social-page.model';

export interface ObraSocialState {
  items: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  pageRequest: ObraSocialPageRequest;
  selected: InsurerComplete | null;
  insurerTypes: InsurerType[];
  nbuVersions: NbuVersion[];
  contactTypes: ContactType[];
  pending: boolean;
  creating: boolean;
  error: HttpErrorResponse | null;
}

export const initialObraSocialState: ObraSocialState = {
  items: [],
  totalElements: 0,
  totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  selected: null,
  insurerTypes: [],
  nbuVersions: [],
  contactTypes: [],
  pending: false,
  creating: false,
  error: null,
};

export const OBRA_SOCIAL_FEATURE_KEY = 'obrasSociales';
