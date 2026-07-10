import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, firstValueFrom, toArray } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { SectionService } from '@features/sucursales/services/section.service';

import { SeccionesEffects } from './secciones.effects';
import {
  loadSecciones, loadSeccionesSuccess, loadSeccionesFailure,
  loadCountBySection,
  loadUnassignedCount,
  addSeccion, addSeccionSuccess, addSeccionFailure,
  updateSeccion, updateSeccionSuccess,
  deleteSeccion, deleteSeccionSuccess,
} from './secciones.actions';

describe('SeccionesEffects', () => {
  let actions$: Observable<Action>;
  let sectionService: {
    listWithBranches: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let analysisService: {
    countBySection: ReturnType<typeof vi.fn>;
    unassignedCount: ReturnType<typeof vi.fn>;
    setSectionAnalyses: ReturnType<typeof vi.fn>;
  };
  let notifications: { success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sectionService = {
      listWithBranches: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    analysisService = {
      countBySection: vi.fn(),
      unassignedCount: vi.fn(),
      setSectionAnalyses: vi.fn(),
    };
    notifications = { success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        SeccionesEffects,
        provideMockActions(() => actions$),
        { provide: SectionService, useValue: sectionService },
        { provide: AnalysisService, useValue: analysisService },
        { provide: NotificationService, useValue: notifications },
      ],
    });
  });

  it('loadSecciones$ mapea el content del page a success', async () => {
    const items = [{ id: 1, name: 'Hematología', active: true, branches: [] }];
    sectionService.listWithBranches.mockReturnValue(
      of({ content: items, totalElements: 1, totalPages: 1, page: 0, size: 100 }),
    );
    actions$ = of(loadSecciones());
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.loadSecciones$);
    expect(action).toEqual(loadSeccionesSuccess({ items }));
  });

  it('loadSecciones$ dispatches failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    sectionService.listWithBranches.mockReturnValue(throwError(() => error));
    actions$ = of(loadSecciones());
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.loadSecciones$);
    expect(action).toEqual(loadSeccionesFailure({ error }));
  });

  it('addSeccion$ crea la sección y luego setea sus análisis (create → setSectionAnalyses)', async () => {
    sectionService.create.mockReturnValue(of({ id: 42, name: 'Nueva', active: true }));
    analysisService.setSectionAnalyses.mockReturnValue(of(undefined));
    actions$ = of(addSeccion({ name: 'Nueva', analysisIds: [5, 6] }));
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.addSeccion$);
    expect(sectionService.create).toHaveBeenCalledWith({ name: 'Nueva' });
    expect(analysisService.setSectionAnalyses).toHaveBeenCalledWith(42, [5, 6]);
    expect(action).toEqual(addSeccionSuccess());
  });

  it('addSeccion$ dispatches failure si create falla (y no llama setSectionAnalyses)', async () => {
    const error = new HttpErrorResponse({ status: 409 });
    sectionService.create.mockReturnValue(throwError(() => error));
    actions$ = of(addSeccion({ name: 'Dup', analysisIds: [] }));
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.addSeccion$);
    expect(analysisService.setSectionAnalyses).not.toHaveBeenCalled();
    expect(action).toEqual(addSeccionFailure({ error }));
  });

  it('updateSeccion$ actualiza el nombre y re-setea los análisis', async () => {
    sectionService.update.mockReturnValue(of({ id: 3, name: 'Editada', active: true }));
    analysisService.setSectionAnalyses.mockReturnValue(of(undefined));
    actions$ = of(updateSeccion({ id: 3, name: 'Editada', analysisIds: [9] }));
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.updateSeccion$);
    expect(sectionService.update).toHaveBeenCalledWith(3, { name: 'Editada' });
    expect(analysisService.setSectionAnalyses).toHaveBeenCalledWith(3, [9]);
    expect(action).toEqual(updateSeccionSuccess());
  });

  it('deleteSeccion$ dispatches deleteSeccionSuccess con el id', async () => {
    sectionService.delete.mockReturnValue(of(undefined));
    actions$ = of(deleteSeccion({ id: 5 }));
    const effects = TestBed.inject(SeccionesEffects);

    const action = await firstValueFrom(effects.deleteSeccion$);
    expect(action).toEqual(deleteSeccionSuccess({ id: 5 }));
  });

  it('reloadAfterMutation$ re-dispara load* tras un success de mutación', async () => {
    actions$ = of(addSeccionSuccess());
    const effects = TestBed.inject(SeccionesEffects);

    const dispatched = await firstValueFrom(effects.reloadAfterMutation$.pipe(toArray()));
    expect(dispatched).toEqual([loadSecciones(), loadCountBySection(), loadUnassignedCount()]);
  });

  it('addSeccionToast$ muestra un toast de éxito (dispatch:false)', async () => {
    actions$ = of(addSeccionSuccess());
    const effects = TestBed.inject(SeccionesEffects);

    await firstValueFrom(effects.addSeccionToast$);
    expect(notifications.success).toHaveBeenCalledWith('Sección creada');
  });
});
