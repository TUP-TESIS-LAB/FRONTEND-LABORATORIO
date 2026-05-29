import { sucursalReducer } from './sucursal.reducer';
import { initialSucursalState, SucursalState } from './sucursal.state';
import * as A from './sucursal.actions';
import { Sucursal } from '../models/sucursal.model';
import { BranchSchedule } from '../models/branch-schedule.model';
import { BranchContact } from '../models/branch-contact.model';
import { BranchWorkspace } from '../models/branch-workspace.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';
import { Area } from '../models/sucursal.model';
import { Section } from '../models/section.model';

// ────── fixtures ──────

const mockSucursal: Sucursal = {
  id: 1,
  code: 'SUC-001',
  description: 'Sucursal Central',
  status: 'ACTIVE',
  address: null,
  responsibleUserId: null,
  active: true,
};

const mockSchedule: BranchSchedule = {
  id: 10,
  branchId: 1,
  dayFrom: 'MONDAY',
  dayTo: 'FRIDAY',
  fromTime: '08:00',
  toTime: '17:00',
  scheduleType: 'MORNING',
  active: true,
};

const mockSchedule2: BranchSchedule = {
  id: 20,
  branchId: 1,
  dayFrom: 'SATURDAY',
  dayTo: 'SATURDAY',
  fromTime: '09:00',
  toTime: '13:00',
  scheduleType: 'MORNING',
  active: true,
};

const mockContact: BranchContact = {
  id: 5,
  branchId: 1,
  contactType: 'PHONE',
  value: '+1-555-0000',
  active: true,
};

const mockWorkspace: BranchWorkspace = {
  id: 3,
  branchId: 1,
  areaId: 100,
  sectionId: 200,
};

const mockTotemConfig: BranchTotemConfig = {
  branchId: 1,
  enabled: true,
};

const mockArea: Area = {
  id: 100,
  name: 'Química Clínica',
  areaType: 'QUIMICA_CLINICA',
  externalLabName: null,
  active: true,
};

const mockSection: Section = {
  id: 200,
  name: 'Sección A',
  areaId: 100,
  active: true,
};

// ────── helpers ──────

function reduce(state: SucursalState, action: ReturnType<typeof A[keyof typeof A]>): SucursalState {
  return sucursalReducer(state, action as any);
}

// ────── tests ──────

describe('sucursalReducer — initial state', () => {
  it('returns the initial state for an unknown action', () => {
    const state = sucursalReducer(undefined, { type: '@@INIT' } as any);
    expect(state).toEqual(initialSucursalState);
  });
});

// ── List (existing behaviour, regression guards) ──────────────────────────────

describe('sucursalReducer — loadSucursales', () => {
  it('sets loading=true on loadSucursales', () => {
    const state = reduce(initialSucursalState, A.loadSucursales());
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates list on loadSucursalesSuccess', () => {
    const state = reduce(initialSucursalState, A.loadSucursalesSuccess({ list: [mockSucursal] }));
    expect(state.list).toEqual([mockSucursal]);
    expect(state.loading).toBe(false);
  });

  it('sets error on loadSucursalesFailure', () => {
    const error = 'network error';
    const state = reduce(initialSucursalState, A.loadSucursalesFailure({ error }));
    expect(state.loading).toBe(false);
    expect(state.error).toBe(error);
  });
});

// ── Add (create sucursal) ────────────────────────────────────────────────────

describe('sucursalReducer — addSucursal', () => {
  it('addSucursalSuccess appends to list AND sets current', () => {
    const state = reduce(initialSucursalState, A.addSucursalSuccess({ sucursal: mockSucursal }));
    expect(state.list).toEqual([mockSucursal]);
    expect(state.current).toEqual(mockSucursal);
    expect(state.saving).toBe(false);
  });
});

// ── Detail ────────────────────────────────────────────────────────────────────

describe('sucursalReducer — loadDetail', () => {
  it('sets loadingDetail=true on loadDetail', () => {
    const state = reduce(initialSucursalState, A.loadDetail({ branchId: 1 }));
    expect(state.loadingDetail).toBe(true);
    expect(state.error).toBeNull();
  });

  it('loadDetailSuccess populates all 5 detail fields', () => {
    const state = reduce(
      initialSucursalState,
      A.loadDetailSuccess({
        branch: mockSucursal,
        schedules: [mockSchedule],
        contacts: [mockContact],
        workspaces: [mockWorkspace],
        totemConfig: mockTotemConfig,
      }),
    );
    expect(state.loadingDetail).toBe(false);
    expect(state.current).toEqual(mockSucursal);
    expect(state.schedules).toEqual([mockSchedule]);
    expect(state.contacts).toEqual([mockContact]);
    expect(state.workspaces).toEqual([mockWorkspace]);
    expect(state.totemConfig).toEqual(mockTotemConfig);
  });

  it('loadDetailSuccess accepts null totemConfig', () => {
    const state = reduce(
      initialSucursalState,
      A.loadDetailSuccess({
        branch: mockSucursal,
        schedules: [],
        contacts: [],
        workspaces: [],
        totemConfig: null,
      }),
    );
    expect(state.totemConfig).toBeNull();
  });

  it('loadDetailFailure clears loadingDetail and sets error', () => {
    const state = reduce(
      { ...initialSucursalState, loadingDetail: true },
      A.loadDetailFailure({ error: 'timeout' }),
    );
    expect(state.loadingDetail).toBe(false);
    expect(state.error).toBe('timeout');
  });
});

// ── Schedules ─────────────────────────────────────────────────────────────────

describe('sucursalReducer — schedules', () => {
  const withSchedules: SucursalState = { ...initialSucursalState, schedules: [mockSchedule] };

  it('addScheduleSuccess appends schedule to list', () => {
    const state = reduce(withSchedules, A.addScheduleSuccess({ schedule: mockSchedule2 }));
    expect(state.schedules).toHaveLength(2);
    expect(state.schedules[1]).toEqual(mockSchedule2);
  });

  it('updateScheduleSuccess replaces schedule by id', () => {
    const updated: BranchSchedule = { ...mockSchedule, fromTime: '07:00' };
    const state = reduce(withSchedules, A.updateScheduleSuccess({ schedule: updated }));
    expect(state.schedules).toHaveLength(1);
    expect(state.schedules[0].fromTime).toBe('07:00');
  });

  it('updateScheduleSuccess leaves other schedules untouched', () => {
    const twoSchedules: SucursalState = { ...initialSucursalState, schedules: [mockSchedule, mockSchedule2] };
    const updated: BranchSchedule = { ...mockSchedule, fromTime: '07:00' };
    const state = reduce(twoSchedules, A.updateScheduleSuccess({ schedule: updated }));
    expect(state.schedules).toHaveLength(2);
    expect(state.schedules[1]).toEqual(mockSchedule2);
  });

  it('deleteScheduleSuccess filters out schedule by id', () => {
    const twoSchedules: SucursalState = { ...initialSucursalState, schedules: [mockSchedule, mockSchedule2] };
    const state = reduce(twoSchedules, A.deleteScheduleSuccess({ id: mockSchedule.id }));
    expect(state.schedules).toHaveLength(1);
    expect(state.schedules[0]).toEqual(mockSchedule2);
  });
});

// ── Workspaces (sync replace-all) ────────────────────────────────────────────

describe('sucursalReducer — workspaces', () => {
  it('syncWorkspacesSuccess replaces entire workspaces array', () => {
    const existing: SucursalState = {
      ...initialSucursalState,
      workspaces: [mockWorkspace],
    };
    const newWorkspace: BranchWorkspace = { id: 99, branchId: 1, areaId: 200, sectionId: 300 };
    const state = reduce(existing, A.syncWorkspacesSuccess({ workspaces: [newWorkspace] }));
    expect(state.workspaces).toEqual([newWorkspace]);
  });

  it('syncWorkspacesSuccess with empty array clears workspaces', () => {
    const existing: SucursalState = { ...initialSucursalState, workspaces: [mockWorkspace] };
    const state = reduce(existing, A.syncWorkspacesSuccess({ workspaces: [] }));
    expect(state.workspaces).toHaveLength(0);
  });
});

// ── Totem config ──────────────────────────────────────────────────────────────

describe('sucursalReducer — totemConfig', () => {
  it('loadTotemConfigSuccess sets totemConfig', () => {
    const state = reduce(initialSucursalState, A.loadTotemConfigSuccess({ totemConfig: mockTotemConfig }));
    expect(state.totemConfig).toEqual(mockTotemConfig);
  });

  it('upsertTotemConfigSuccess updates totemConfig', () => {
    const updated: BranchTotemConfig = { branchId: 1, enabled: false };
    const state = reduce(
      { ...initialSucursalState, totemConfig: mockTotemConfig },
      A.upsertTotemConfigSuccess({ totemConfig: updated }),
    );
    expect(state.totemConfig?.enabled).toBe(false);
  });
});

// ── Areas ─────────────────────────────────────────────────────────────────────

describe('sucursalReducer — areas', () => {
  const withAreas: SucursalState = { ...initialSucursalState, areas: [mockArea] };

  it('loadAreas sets loadingCatalog=true', () => {
    const state = reduce(initialSucursalState, A.loadAreas());
    expect(state.loadingCatalog).toBe(true);
  });

  it('loadAreasSuccess populates areas and resets loadingCatalog', () => {
    const state = reduce(initialSucursalState, A.loadAreasSuccess({ areas: [mockArea] }));
    expect(state.areas).toEqual([mockArea]);
    expect(state.loadingCatalog).toBe(false);
  });

  it('addAreaSuccess appends to areas list', () => {
    const newArea: Area = { id: 101, name: 'Hematología', areaType: 'HEMATOLOGIA_HEMOSTASIA', externalLabName: null, active: true };
    const state = reduce(withAreas, A.addAreaSuccess({ area: newArea }));
    expect(state.areas).toHaveLength(2);
  });

  it('updateAreaSuccess replaces area by id', () => {
    const updated: Area = { ...mockArea, name: 'Química Clínica Actualizada' };
    const state = reduce(withAreas, A.updateAreaSuccess({ area: updated }));
    expect(state.areas[0].name).toBe('Química Clínica Actualizada');
  });

  it('toggleAreaStatusSuccess updates the toggled area in the list', () => {
    const toggled: Area = { ...mockArea, active: false };
    const state = reduce(withAreas, A.toggleAreaStatusSuccess({ area: toggled }));
    expect(state.areas[0].active).toBe(false);
  });
});

// ── Sections ──────────────────────────────────────────────────────────────────

describe('sucursalReducer — sections', () => {
  const withSections: SucursalState = { ...initialSucursalState, sections: [mockSection] };

  it('loadSectionsSuccess populates sections', () => {
    const state = reduce(initialSucursalState, A.loadSectionsSuccess({ sections: [mockSection] }));
    expect(state.sections).toEqual([mockSection]);
    expect(state.loadingCatalog).toBe(false);
  });

  it('loadSectionsSuccess replaces previous sections (per-area loading pattern)', () => {
    // Simulates switching from area 100 to area 101: new sections must replace the old ones.
    const sectionArea101: Section = { id: 300, name: 'Sección X', areaId: 101, active: true };
    const withSectionsA100: SucursalState = { ...initialSucursalState, sections: [mockSection] };
    const state = reduce(withSectionsA100, A.loadSectionsSuccess({ sections: [sectionArea101] }));
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0].areaId).toBe(101);
  });

  it('addSectionSuccess appends section', () => {
    const newSection: Section = { id: 201, name: 'Sección B', areaId: 100, active: true };
    const state = reduce(withSections, A.addSectionSuccess({ section: newSection }));
    expect(state.sections).toHaveLength(2);
  });

  it('updateSectionSuccess replaces section by id', () => {
    const updated: Section = { ...mockSection, name: 'Sección A Actualizada' };
    const state = reduce(withSections, A.updateSectionSuccess({ section: updated }));
    expect(state.sections[0].name).toBe('Sección A Actualizada');
  });

  it('toggleSectionStatusSuccess updates the toggled section', () => {
    const toggled: Section = { ...mockSection, active: false };
    const state = reduce(withSections, A.toggleSectionStatusSuccess({ section: toggled }));
    expect(state.sections[0].active).toBe(false);
  });
});

// ── UI state ──────────────────────────────────────────────────────────────────

describe('sucursalReducer — UI state', () => {
  it('selectAreaForSections sets selectedAreaId', () => {
    const state = reduce(initialSucursalState, A.selectAreaForSections({ areaId: 42 }));
    expect(state.selectedAreaId).toBe(42);
  });

  it('selectAreaForSections can be called multiple times to update the selection', () => {
    let state = reduce(initialSucursalState, A.selectAreaForSections({ areaId: 42 }));
    state = reduce(state, A.selectAreaForSections({ areaId: 99 }));
    expect(state.selectedAreaId).toBe(99);
  });
});
