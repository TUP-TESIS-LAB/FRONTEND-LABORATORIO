import { createReducer, on } from '@ngrx/store';
import { initialSucursalState, SucursalState } from './sucursal.state';
import * as A from './sucursal.actions';

export const sucursalReducer = createReducer(
  initialSucursalState,

  // ──────────────────────────────────────────────────────────────────────────
  // List — Load
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadSucursales, (state): SucursalState => ({ ...state, loading: true, error: null })),
  on(A.loadSucursalesSuccess, (state, { list }): SucursalState => ({ ...state, loading: false, list })),
  on(A.loadSucursalesFailure, (state, { error }): SucursalState => ({ ...state, loading: false, error })),

  // Add
  on(A.addSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addSucursalSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: [...state.list, sucursal],
  })),
  on(A.addSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Update
  on(A.updateSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateSucursalSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.map(s => s.id === sucursal.id ? sucursal : s),
  })),
  on(A.updateSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Toggle status
  on(A.toggleSucursalStatus, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.toggleSucursalStatusSuccess, (state, { sucursal }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.map(s => s.id === sucursal.id ? sucursal : s),
  })),
  on(A.toggleSucursalStatusFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // Delete
  on(A.deleteSucursal, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.deleteSucursalSuccess, (state, { id }): SucursalState => ({
    ...state,
    saving: false,
    list: state.list.filter(s => s.id !== id),
  })),
  on(A.deleteSucursalFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Detail
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadDetail, (state): SucursalState => ({ ...state, loadingDetail: true, error: null })),
  on(A.loadDetailSuccess, (state, { branch, schedules, contacts, workspaces, totemConfig }): SucursalState => ({
    ...state,
    loadingDetail: false,
    current: branch,
    schedules,
    contacts,
    workspaces,
    totemConfig,
  })),
  on(A.loadDetailFailure, (state, { error }): SucursalState => ({ ...state, loadingDetail: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Schedules
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadSchedules, (state): SucursalState => ({ ...state, error: null })),
  on(A.loadSchedulesSuccess, (state, { schedules }): SucursalState => ({ ...state, schedules })),
  on(A.loadSchedulesFailure, (state, { error }): SucursalState => ({ ...state, error })),

  on(A.addSchedule, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addScheduleSuccess, (state, { schedule }): SucursalState => ({
    ...state,
    saving: false,
    schedules: [...state.schedules, schedule],
  })),
  on(A.addScheduleFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.updateSchedule, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateScheduleSuccess, (state, { schedule }): SucursalState => ({
    ...state,
    saving: false,
    schedules: state.schedules.map(s => s.id === schedule.id ? schedule : s),
  })),
  on(A.updateScheduleFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.deleteSchedule, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.deleteScheduleSuccess, (state, { id }): SucursalState => ({
    ...state,
    saving: false,
    schedules: state.schedules.filter(s => s.id !== id),
  })),
  on(A.deleteScheduleFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Contacts
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadContacts, (state): SucursalState => ({ ...state, error: null })),
  on(A.loadContactsSuccess, (state, { contacts }): SucursalState => ({ ...state, contacts })),
  on(A.loadContactsFailure, (state, { error }): SucursalState => ({ ...state, error })),

  on(A.addContact, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addContactSuccess, (state, { contact }): SucursalState => ({
    ...state,
    saving: false,
    contacts: [...state.contacts, contact],
  })),
  on(A.addContactFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.updateContact, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateContactSuccess, (state, { contact }): SucursalState => ({
    ...state,
    saving: false,
    contacts: state.contacts.map(c => c.id === contact.id ? contact : c),
  })),
  on(A.updateContactFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.deleteContact, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.deleteContactSuccess, (state, { id }): SucursalState => ({
    ...state,
    saving: false,
    contacts: state.contacts.filter(c => c.id !== id),
  })),
  on(A.deleteContactFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Workspaces
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadWorkspaces, (state): SucursalState => ({ ...state, error: null })),
  on(A.loadWorkspacesSuccess, (state, { workspaces }): SucursalState => ({ ...state, workspaces })),
  on(A.loadWorkspacesFailure, (state, { error }): SucursalState => ({ ...state, error })),

  on(A.syncWorkspaces, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.syncWorkspacesSuccess, (state, { workspaces }): SucursalState => ({
    ...state,
    saving: false,
    workspaces,
  })),
  on(A.syncWorkspacesFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Totem config
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadTotemConfig, (state): SucursalState => ({ ...state, error: null })),
  on(A.loadTotemConfigSuccess, (state, { totemConfig }): SucursalState => ({ ...state, totemConfig })),
  on(A.loadTotemConfigFailure, (state, { error }): SucursalState => ({ ...state, error })),

  on(A.upsertTotemConfig, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.upsertTotemConfigSuccess, (state, { totemConfig }): SucursalState => ({
    ...state,
    saving: false,
    totemConfig,
  })),
  on(A.upsertTotemConfigFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Areas
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadAreas, (state): SucursalState => ({ ...state, loadingCatalog: true, error: null })),
  on(A.loadAreasSuccess, (state, { areas }): SucursalState => ({ ...state, loadingCatalog: false, areas })),
  on(A.loadAreasFailure, (state, { error }): SucursalState => ({ ...state, loadingCatalog: false, error })),

  on(A.addArea, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addAreaSuccess, (state, { area }): SucursalState => ({
    ...state,
    saving: false,
    areas: [...state.areas, area],
  })),
  on(A.addAreaFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.updateArea, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateAreaSuccess, (state, { area }): SucursalState => ({
    ...state,
    saving: false,
    areas: state.areas.map(a => a.id === area.id ? area : a),
  })),
  on(A.updateAreaFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.toggleAreaStatus, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.toggleAreaStatusSuccess, (state, { area }): SucursalState => ({
    ...state,
    saving: false,
    areas: state.areas.map(a => a.id === area.id ? area : a),
  })),
  on(A.toggleAreaStatusFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // Sections
  // ──────────────────────────────────────────────────────────────────────────
  on(A.loadSections, (state): SucursalState => ({ ...state, loadingCatalog: true, error: null })),
  on(A.loadSectionsSuccess, (state, { sections }): SucursalState => ({ ...state, loadingCatalog: false, sections })),
  on(A.loadSectionsFailure, (state, { error }): SucursalState => ({ ...state, loadingCatalog: false, error })),

  on(A.addSection, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.addSectionSuccess, (state, { section }): SucursalState => ({
    ...state,
    saving: false,
    sections: [...state.sections, section],
  })),
  on(A.addSectionFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.updateSection, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.updateSectionSuccess, (state, { section }): SucursalState => ({
    ...state,
    saving: false,
    sections: state.sections.map(s => s.id === section.id ? section : s),
  })),
  on(A.updateSectionFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  on(A.toggleSectionStatus, (state): SucursalState => ({ ...state, saving: true, error: null })),
  on(A.toggleSectionStatusSuccess, (state, { section }): SucursalState => ({
    ...state,
    saving: false,
    sections: state.sections.map(s => s.id === section.id ? section : s),
  })),
  on(A.toggleSectionStatusFailure, (state, { error }): SucursalState => ({ ...state, saving: false, error })),

  // ──────────────────────────────────────────────────────────────────────────
  // UI state
  // ──────────────────────────────────────────────────────────────────────────
  on(A.selectAreaForSections, (state, { areaId }): SucursalState => ({ ...state, selectedAreaId: areaId })),
);
