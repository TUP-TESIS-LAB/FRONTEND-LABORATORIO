import { Sucursal } from '../models/sucursal.model';
import { BranchSchedule } from '../models/branch-schedule.model';
import { BranchContact } from '../models/branch-contact.model';
import { BranchWorkspace } from '../models/branch-workspace.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';
import { Area } from '../models/sucursal.model';
import { Section } from '../models/section.model';

export interface SucursalState {
  // List
  list: Sucursal[];
  loading: boolean;
  saving: boolean;
  error: unknown | null;

  // Detail
  current: Sucursal | null;
  loadingDetail: boolean;
  schedules: BranchSchedule[];
  contacts: BranchContact[];
  workspaces: BranchWorkspace[];
  totemConfig: BranchTotemConfig | null;

  // Catalog (tenant-level)
  areas: Area[];
  sections: Section[];
  loadingCatalog: boolean;
  selectedAreaId: number | null;
}

export const initialSucursalState: SucursalState = {
  list: [],
  loading: false,
  saving: false,
  error: null,

  current: null,
  loadingDetail: false,
  schedules: [],
  contacts: [],
  workspaces: [],
  totemConfig: null,

  areas: [],
  sections: [],
  loadingCatalog: false,
  selectedAreaId: null,
};

export const SUCURSAL_FEATURE_KEY = 'sucursalAdmin';
