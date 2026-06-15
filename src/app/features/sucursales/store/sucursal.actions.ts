import { createAction, props } from '@ngrx/store';
import { Sucursal, SucursalCreateInput, SucursalUpdateInput, Area, AreaCreateInput } from '../models/sucursal.model';
import { BranchSchedule, BranchScheduleCreateInput } from '../models/branch-schedule.model';
import { BranchContact, BranchContactCreateInput } from '../models/branch-contact.model';
import { BranchWorkspace, BranchWorkspaceCreateInput } from '../models/branch-workspace.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';
import { Section, SectionCreateInput } from '../models/section.model';

// ──────────────────────────────────────────────────────────────────────────────
// List (existing)
// ──────────────────────────────────────────────────────────────────────────────
export const loadSucursales = createAction('[Sucursales] Load');
export const loadSucursalesSuccess = createAction('[Sucursales] Load Success', props<{ list: Sucursal[] }>());
export const loadSucursalesFailure = createAction('[Sucursales] Load Failure', props<{ error: unknown }>());

export const addSucursal = createAction('[Sucursales] Add', props<{ input: SucursalCreateInput }>());
export const addSucursalSuccess = createAction('[Sucursales] Add Success', props<{ sucursal: Sucursal }>());
export const addSucursalFailure = createAction('[Sucursales] Add Failure', props<{ error: unknown }>());

export const updateSucursal = createAction('[Sucursales] Update', props<{ id: number; input: SucursalUpdateInput }>());
export const updateSucursalSuccess = createAction('[Sucursales] Update Success', props<{ sucursal: Sucursal }>());
export const updateSucursalFailure = createAction('[Sucursales] Update Failure', props<{ error: unknown }>());

export const toggleSucursalStatus = createAction('[Sucursales] Toggle Status', props<{ id: number }>());
export const toggleSucursalStatusSuccess = createAction('[Sucursales] Toggle Status Success', props<{ sucursal: Sucursal }>());
export const toggleSucursalStatusFailure = createAction('[Sucursales] Toggle Status Failure', props<{ error: unknown }>());

export const deleteSucursal = createAction('[Sucursales] Delete', props<{ id: number }>());
export const deleteSucursalSuccess = createAction('[Sucursales] Delete Success', props<{ id: number }>());
export const deleteSucursalFailure = createAction('[Sucursales] Delete Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Detail — parallel load of branch + all sub-recursos
// ──────────────────────────────────────────────────────────────────────────────
export const loadDetail = createAction('[Sucursal] Load Detail', props<{ branchId: number }>());
export const loadDetailSuccess = createAction(
  '[Sucursal] Load Detail Success',
  props<{
    branch: Sucursal;
    schedules: BranchSchedule[];
    contacts: BranchContact[];
    workspaces: BranchWorkspace[];
    totemConfig: BranchTotemConfig | null;
  }>(),
);
export const loadDetailFailure = createAction('[Sucursal] Load Detail Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Schedules
// ──────────────────────────────────────────────────────────────────────────────
export const loadSchedules = createAction('[Sucursal] Load Schedules', props<{ branchId: number }>());
export const loadSchedulesSuccess = createAction('[Sucursal] Load Schedules Success', props<{ schedules: BranchSchedule[] }>());
export const loadSchedulesFailure = createAction('[Sucursal] Load Schedules Failure', props<{ error: unknown }>());

export const addSchedule = createAction('[Sucursal] Add Schedule', props<{ branchId: number; input: BranchScheduleCreateInput }>());
export const addScheduleSuccess = createAction('[Sucursal] Add Schedule Success', props<{ schedule: BranchSchedule }>());
export const addScheduleFailure = createAction('[Sucursal] Add Schedule Failure', props<{ error: unknown }>());

export const updateSchedule = createAction('[Sucursal] Update Schedule', props<{ branchId: number; id: number; input: BranchScheduleCreateInput }>());
export const updateScheduleSuccess = createAction('[Sucursal] Update Schedule Success', props<{ schedule: BranchSchedule }>());
export const updateScheduleFailure = createAction('[Sucursal] Update Schedule Failure', props<{ error: unknown }>());

export const deleteSchedule = createAction('[Sucursal] Delete Schedule', props<{ branchId: number; id: number }>());
export const deleteScheduleSuccess = createAction('[Sucursal] Delete Schedule Success', props<{ id: number }>());
export const deleteScheduleFailure = createAction('[Sucursal] Delete Schedule Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Contacts
// ──────────────────────────────────────────────────────────────────────────────
export const loadContacts = createAction('[Sucursal] Load Contacts', props<{ branchId: number }>());
export const loadContactsSuccess = createAction('[Sucursal] Load Contacts Success', props<{ contacts: BranchContact[] }>());
export const loadContactsFailure = createAction('[Sucursal] Load Contacts Failure', props<{ error: unknown }>());

export const addContact = createAction('[Sucursal] Add Contact', props<{ branchId: number; input: BranchContactCreateInput }>());
export const addContactSuccess = createAction('[Sucursal] Add Contact Success', props<{ contact: BranchContact }>());
export const addContactFailure = createAction('[Sucursal] Add Contact Failure', props<{ error: unknown }>());

export const updateContact = createAction('[Sucursal] Update Contact', props<{ branchId: number; id: number; input: BranchContactCreateInput }>());
export const updateContactSuccess = createAction('[Sucursal] Update Contact Success', props<{ contact: BranchContact }>());
export const updateContactFailure = createAction('[Sucursal] Update Contact Failure', props<{ error: unknown }>());

export const deleteContact = createAction('[Sucursal] Delete Contact', props<{ branchId: number; id: number }>());
export const deleteContactSuccess = createAction('[Sucursal] Delete Contact Success', props<{ id: number }>());
export const deleteContactFailure = createAction('[Sucursal] Delete Contact Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Workspaces (replace-all sync)
// ──────────────────────────────────────────────────────────────────────────────
export const loadWorkspaces = createAction('[Sucursal] Load Workspaces', props<{ branchId: number }>());
export const loadWorkspacesSuccess = createAction('[Sucursal] Load Workspaces Success', props<{ workspaces: BranchWorkspace[] }>());
export const loadWorkspacesFailure = createAction('[Sucursal] Load Workspaces Failure', props<{ error: unknown }>());

export const syncWorkspaces = createAction('[Sucursal] Sync Workspaces', props<{ branchId: number; workspaces: BranchWorkspaceCreateInput[] }>());
export const syncWorkspacesSuccess = createAction('[Sucursal] Sync Workspaces Success', props<{ workspaces: BranchWorkspace[] }>());
export const syncWorkspacesFailure = createAction('[Sucursal] Sync Workspaces Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Totem config
// ──────────────────────────────────────────────────────────────────────────────
export const loadTotemConfig = createAction('[Sucursal] Load Totem Config', props<{ branchId: number }>());
export const loadTotemConfigSuccess = createAction('[Sucursal] Load Totem Config Success', props<{ totemConfig: BranchTotemConfig | null }>());
export const loadTotemConfigFailure = createAction('[Sucursal] Load Totem Config Failure', props<{ error: unknown }>());

export const upsertTotemConfig = createAction('[Sucursal] Upsert Totem Config',
  props<{ branchId: number; enabled: boolean; atencionDisplayEnabled: boolean; extraccionDisplayEnabled: boolean }>());
export const upsertTotemConfigSuccess = createAction('[Sucursal] Upsert Totem Config Success', props<{ totemConfig: BranchTotemConfig }>());
export const upsertTotemConfigFailure = createAction('[Sucursal] Upsert Totem Config Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Areas (catalog, tenant-level)
// ──────────────────────────────────────────────────────────────────────────────
export const loadAreas = createAction('[Sucursal] Load Areas');
export const loadAreasSuccess = createAction('[Sucursal] Load Areas Success', props<{ areas: Area[] }>());
export const loadAreasFailure = createAction('[Sucursal] Load Areas Failure', props<{ error: unknown }>());

export const addArea = createAction('[Sucursal] Add Area', props<{ input: AreaCreateInput }>());
export const addAreaSuccess = createAction('[Sucursal] Add Area Success', props<{ area: Area }>());
export const addAreaFailure = createAction('[Sucursal] Add Area Failure', props<{ error: unknown }>());

export const updateArea = createAction('[Sucursal] Update Area', props<{ id: number; input: AreaCreateInput }>());
export const updateAreaSuccess = createAction('[Sucursal] Update Area Success', props<{ area: Area }>());
export const updateAreaFailure = createAction('[Sucursal] Update Area Failure', props<{ error: unknown }>());

export const toggleAreaStatus = createAction('[Sucursal] Toggle Area Status', props<{ id: number }>());
export const toggleAreaStatusSuccess = createAction('[Sucursal] Toggle Area Status Success', props<{ area: Area }>());
export const toggleAreaStatusFailure = createAction('[Sucursal] Toggle Area Status Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// Sections (catalog, scoped by area)
// ──────────────────────────────────────────────────────────────────────────────
export const loadSections = createAction('[Sucursal] Load Sections', props<{ areaId?: number }>());
export const loadSectionsSuccess = createAction('[Sucursal] Load Sections Success', props<{ sections: Section[] }>());
export const loadSectionsFailure = createAction('[Sucursal] Load Sections Failure', props<{ error: unknown }>());

export const addSection = createAction('[Sucursal] Add Section', props<{ input: SectionCreateInput }>());
export const addSectionSuccess = createAction('[Sucursal] Add Section Success', props<{ section: Section }>());
export const addSectionFailure = createAction('[Sucursal] Add Section Failure', props<{ error: unknown }>());

export const updateSection = createAction('[Sucursal] Update Section', props<{ id: number; input: SectionCreateInput }>());
export const updateSectionSuccess = createAction('[Sucursal] Update Section Success', props<{ section: Section }>());
export const updateSectionFailure = createAction('[Sucursal] Update Section Failure', props<{ error: unknown }>());

export const toggleSectionStatus = createAction('[Sucursal] Toggle Section Status', props<{ id: number }>());
export const toggleSectionStatusSuccess = createAction('[Sucursal] Toggle Section Status Success', props<{ section: Section }>());
export const toggleSectionStatusFailure = createAction('[Sucursal] Toggle Section Status Failure', props<{ error: unknown }>());

// ──────────────────────────────────────────────────────────────────────────────
// UI state
// ──────────────────────────────────────────────────────────────────────────────
export const selectAreaForSections = createAction('[Sucursal] Select Area For Sections', props<{ areaId: number }>());
