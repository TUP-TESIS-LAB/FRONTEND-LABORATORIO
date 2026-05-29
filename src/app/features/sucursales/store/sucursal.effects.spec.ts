import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { SucursalEffects } from './sucursal.effects';
import { SucursalService } from '../services/sucursal.service';
import { BranchScheduleService } from '../services/branch-schedule.service';
import { BranchContactService } from '../services/branch-contact.service';
import { BranchWorkspaceService } from '../services/branch-workspace.service';
import { BranchTotemConfigService } from '../services/branch-totem-config.service';
import { AreaService } from '../services/area.service';
import { SectionService } from '../services/section.service';
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

const mockContact: BranchContact = {
  id: 5,
  branchId: 1,
  contactType: 'PHONE',
  value: '+1-555-0000',
  active: true,
};

const mockWorkspace: BranchWorkspace = { id: 3, branchId: 1, areaId: 100, sectionId: 200 };

const mockTotemConfig: BranchTotemConfig = { branchId: 1, enabled: true };

const mockArea: Area = { id: 100, name: 'Química Clínica', areaType: 'QUIMICA_CLINICA', externalLabName: null, active: true };

const mockSection: Section = { id: 200, name: 'Sección A', areaId: 100, active: true };

// ────── setup ──────

describe('SucursalEffects', () => {
  let actions$: Observable<Action>;
  let effects: SucursalEffects;
  let sucursalService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggleStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };
  let scheduleService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let contactService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let workspaceService: {
    list: ReturnType<typeof vi.fn>;
    sync: ReturnType<typeof vi.fn>;
  };
  let totemConfigService: {
    get: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  let areaService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggleStatus: ReturnType<typeof vi.fn>;
  };
  let sectionService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    toggleStatus: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sucursalService = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      toggleStatus: vi.fn(),
      delete: vi.fn(),
      getById: vi.fn(),
    };
    scheduleService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    contactService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    workspaceService = { list: vi.fn(), sync: vi.fn() };
    totemConfigService = { get: vi.fn(), upsert: vi.fn() };
    areaService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn() };
    sectionService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn() };
    messageService = { add: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        SucursalEffects,
        provideMockActions(() => actions$),
        { provide: SucursalService, useValue: sucursalService },
        { provide: BranchScheduleService, useValue: scheduleService },
        { provide: BranchContactService, useValue: contactService },
        { provide: BranchWorkspaceService, useValue: workspaceService },
        { provide: BranchTotemConfigService, useValue: totemConfigService },
        { provide: AreaService, useValue: areaService },
        { provide: SectionService, useValue: sectionService },
        { provide: MessageService, useValue: messageService },
      ],
    });

    effects = TestBed.inject(SucursalEffects);
  });

  // ── load$ ─────────────────────────────────────────────────────────────────

  describe('load$', () => {
    it('success: dispatches loadSucursalesSuccess with page content', () => {
      return new Promise<void>((resolve) => {
        sucursalService.list.mockReturnValue(of({ content: [mockSucursal], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
        actions$ = of(A.loadSucursales());

        effects.load$.subscribe((action) => {
          expect(action).toEqual(A.loadSucursalesSuccess({ list: [mockSucursal] }));
          resolve();
        });
      });
    });

    it('failure: dispatches loadSucursalesFailure on HTTP error', () => {
      return new Promise<void>((resolve) => {
        const error = new Error('Network error');
        sucursalService.list.mockReturnValue(throwError(() => error));
        actions$ = of(A.loadSucursales());

        effects.load$.subscribe((action) => {
          expect(action).toEqual(A.loadSucursalesFailure({ error }));
          resolve();
        });
      });
    });
  });

  // ── add$ ──────────────────────────────────────────────────────────────────

  describe('add$', () => {
    it('success: dispatches addSucursalSuccess with returned sucursal', () => {
      return new Promise<void>((resolve) => {
        sucursalService.create.mockReturnValue(of(mockSucursal));
        const input = { code: 'SUC-001', description: 'Sucursal Central', status: 'ACTIVE' as const };
        actions$ = of(A.addSucursal({ input }));

        effects.add$.subscribe((action) => {
          expect(action).toEqual(A.addSucursalSuccess({ sucursal: mockSucursal }));
          expect(sucursalService.create).toHaveBeenCalledWith(input);
          resolve();
        });
      });
    });
  });

  // ── loadDetail$ ───────────────────────────────────────────────────────────

  describe('loadDetail$', () => {
    it('success: dispatches loadDetailSuccess with all sub-recursos in parallel', () => {
      return new Promise<void>((resolve) => {
        sucursalService.getById.mockReturnValue(of(mockSucursal));
        scheduleService.list.mockReturnValue(of([mockSchedule]));
        contactService.list.mockReturnValue(of([mockContact]));
        workspaceService.list.mockReturnValue(of([mockWorkspace]));
        totemConfigService.get.mockReturnValue(of(mockTotemConfig));

        actions$ = of(A.loadDetail({ branchId: 1 }));

        effects.loadDetail$.subscribe((action) => {
          expect(action).toEqual(A.loadDetailSuccess({
            branch: mockSucursal,
            schedules: [mockSchedule],
            contacts: [mockContact],
            workspaces: [mockWorkspace],
            totemConfig: mockTotemConfig,
          }));
          // All 5 services must have been called
          expect(sucursalService.getById).toHaveBeenCalledWith(1);
          expect(scheduleService.list).toHaveBeenCalledWith(1);
          expect(contactService.list).toHaveBeenCalledWith(1);
          expect(workspaceService.list).toHaveBeenCalledWith(1);
          expect(totemConfigService.get).toHaveBeenCalledWith(1);
          resolve();
        });
      });
    });

    it('failure: dispatches loadDetailFailure when one service fails', () => {
      return new Promise<void>((resolve) => {
        sucursalService.getById.mockReturnValue(throwError(() => new Error('not found')));
        scheduleService.list.mockReturnValue(of([]));
        contactService.list.mockReturnValue(of([]));
        workspaceService.list.mockReturnValue(of([]));
        totemConfigService.get.mockReturnValue(of(null));

        actions$ = of(A.loadDetail({ branchId: 1 }));

        effects.loadDetail$.subscribe((action) => {
          expect(action.type).toBe('[Sucursal] Load Detail Failure');
          resolve();
        });
      });
    });
  });

  // ── addSchedule$ ──────────────────────────────────────────────────────────

  describe('addSchedule$', () => {
    it('success: dispatches addScheduleSuccess', () => {
      return new Promise<void>((resolve) => {
        scheduleService.create.mockReturnValue(of(mockSchedule));
        const input = { dayFrom: 'MONDAY' as const, dayTo: 'FRIDAY' as const, fromTime: '08:00', toTime: '17:00', scheduleType: 'MORNING' as const };
        actions$ = of(A.addSchedule({ branchId: 1, input }));

        effects.addSchedule$.subscribe((action) => {
          expect(action).toEqual(A.addScheduleSuccess({ schedule: mockSchedule }));
          expect(scheduleService.create).toHaveBeenCalledWith(1, input);
          resolve();
        });
      });
    });

    it('failure: dispatches addScheduleFailure on error', () => {
      return new Promise<void>((resolve) => {
        const error = new Error('server error');
        scheduleService.create.mockReturnValue(throwError(() => error));
        const input = { dayFrom: 'MONDAY' as const, dayTo: 'FRIDAY' as const, fromTime: '08:00', toTime: '17:00', scheduleType: 'MORNING' as const };
        actions$ = of(A.addSchedule({ branchId: 1, input }));

        effects.addSchedule$.subscribe((action) => {
          expect(action.type).toBe('[Sucursal] Add Schedule Failure');
          resolve();
        });
      });
    });
  });

  // ── syncWorkspaces$ ───────────────────────────────────────────────────────

  describe('syncWorkspaces$', () => {
    it('success: dispatches syncWorkspacesSuccess with returned workspaces', () => {
      return new Promise<void>((resolve) => {
        workspaceService.sync.mockReturnValue(of([mockWorkspace]));
        const workspaces = [{ areaId: 100, sectionId: 200 }];
        actions$ = of(A.syncWorkspaces({ branchId: 1, workspaces }));

        effects.syncWorkspaces$.subscribe((action) => {
          expect(action).toEqual(A.syncWorkspacesSuccess({ workspaces: [mockWorkspace] }));
          expect(workspaceService.sync).toHaveBeenCalledWith(1, workspaces);
          resolve();
        });
      });
    });
  });

  // ── loadAreas$ ────────────────────────────────────────────────────────────

  describe('loadAreas$', () => {
    it('success: dispatches loadAreasSuccess with page content', () => {
      return new Promise<void>((resolve) => {
        areaService.list.mockReturnValue(of({ content: [mockArea], totalElements: 1, totalPages: 1, page: 0, size: 100 }));
        actions$ = of(A.loadAreas());

        effects.loadAreas$.subscribe((action) => {
          expect(action).toEqual(A.loadAreasSuccess({ areas: [mockArea] }));
          expect(areaService.list).toHaveBeenCalledWith({ page: 0, size: 100 });
          resolve();
        });
      });
    });

    it('failure: dispatches loadAreasFailure on error', () => {
      return new Promise<void>((resolve) => {
        areaService.list.mockReturnValue(throwError(() => new Error('server error')));
        actions$ = of(A.loadAreas());

        effects.loadAreas$.subscribe((action) => {
          expect(action.type).toBe('[Sucursal] Load Areas Failure');
          resolve();
        });
      });
    });
  });

  // ── toggleAreaStatus$ ────────────────────────────────────────────────────

  describe('toggleAreaStatus$', () => {
    it('success: dispatches toggleAreaStatusSuccess', () => {
      return new Promise<void>((resolve) => {
        const toggled: Area = { ...mockArea, active: false };
        areaService.toggleStatus.mockReturnValue(of(toggled));
        actions$ = of(A.toggleAreaStatus({ id: 100 }));

        effects.toggleAreaStatus$.subscribe((action) => {
          expect(action).toEqual(A.toggleAreaStatusSuccess({ area: toggled }));
          resolve();
        });
      });
    });
  });

  // ── loadSections$ ─────────────────────────────────────────────────────────

  describe('loadSections$', () => {
    it('success: dispatches loadSectionsSuccess with page content', () => {
      return new Promise<void>((resolve) => {
        sectionService.list.mockReturnValue(of({ content: [mockSection], totalElements: 1, totalPages: 1, page: 0, size: 100 }));
        actions$ = of(A.loadSections({ areaId: 100 }));

        effects.loadSections$.subscribe((action) => {
          expect(action).toEqual(A.loadSectionsSuccess({ sections: [mockSection] }));
          expect(sectionService.list).toHaveBeenCalledWith({ areaId: 100, page: 0, size: 100 });
          resolve();
        });
      });
    });

    it('success without areaId: passes undefined to service', () => {
      return new Promise<void>((resolve) => {
        sectionService.list.mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 100 }));
        actions$ = of(A.loadSections({}));

        effects.loadSections$.subscribe((action) => {
          expect(action.type).toBe('[Sucursal] Load Sections Success');
          expect(sectionService.list).toHaveBeenCalledWith({ areaId: undefined, page: 0, size: 100 });
          resolve();
        });
      });
    });
  });
});
