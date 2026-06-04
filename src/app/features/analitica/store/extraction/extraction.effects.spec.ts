import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { NOT_MODIFIED } from '@core/refresh';
import { ExtractorBoxService } from '@core/services/extractor-box.service';
import { NotificationService } from '@core/services/notification.service';
import { TokenService } from '@core/auth/token.service';
import { ExtractorAttentionService } from '../../services/extractor-attention.service';
import * as A from './extraction.actions';
import { ExtractionEffects } from './extraction.effects';
import { EXTRACTION_FEATURE_KEY, initialExtractionState } from './extraction.state';

describe('ExtractionEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof ExtractorAttentionService, ReturnType<typeof vi.fn>>>;
  let notifier: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let boxService: { setSelectedBranch: ReturnType<typeof vi.fn> };
  let tokenService: { getUserId: ReturnType<typeof vi.fn> };
  let effects: ExtractionEffects;

  function setup(branchId: number | null = 7): void {
    actions$ = new ReplaySubject(1);
    api = {
      getMyBranches: vi.fn(),
      getAwaiting: vi.fn(),
      getMine: vi.fn(),
      getStats: vi.fn(),
      getBoxOccupancy: vi.fn(),
      getBoxAssignments: vi.fn(),
      getBranchExtractors: vi.fn(),
      assignExtractor: vi.fn(),
      unassignExtraction: vi.fn(),
      cancelExtraction: vi.fn(),
      endExtraction: vi.fn(),
      saveBoxAssignments: vi.fn(),
    };
    notifier = { success: vi.fn(), error: vi.fn() };
    boxService = { setSelectedBranch: vi.fn() };
    tokenService = { getUserId: vi.fn().mockReturnValue(99) };
    TestBed.configureTestingModule({
      providers: [
        ExtractionEffects,
        provideMockActions(() => actions$ as unknown as Observable<Action>),
        provideMockStore({
          initialState: {
            [EXTRACTION_FEATURE_KEY]: {
              ...initialExtractionState,
              selectedBranchId: branchId,
              branchExtractors: [{ id: 99, fullName: 'Juan Pérez' }],
            },
          },
        }),
        { provide: ExtractorAttentionService, useValue: api },
        { provide: NotificationService, useValue: notifier },
        { provide: ExtractorBoxService, useValue: boxService },
        { provide: TokenService, useValue: tokenService },
      ],
    });
    effects = TestBed.inject(ExtractionEffects);
  }

  describe('with a selected branch', () => {
    beforeEach(() => setup(7));

    it('loadAwaiting$ → Success on data', async () => {
      (api.getAwaiting as ReturnType<typeof vi.fn>).mockReturnValue(of([{ id: 1 }]));
      const promise = firstValueFrom(effects.loadAwaiting$.pipe(take(1)));
      actions$.next(A.loadAwaiting());
      expect(await promise).toEqual(A.loadAwaitingSuccess({ items: [{ id: 1 }] as never }));
      expect(api.getAwaiting).toHaveBeenCalledWith(7);
    });

    it('loadAwaiting$ → NotModified action on sentinel', async () => {
      (api.getAwaiting as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
      const promise = firstValueFrom(effects.loadAwaiting$.pipe(take(1)));
      actions$.next(A.loadAwaiting());
      expect(await promise).toEqual(A.loadAwaitingNotModified());
    });

    it('loadAwaiting$ → Failure on http error', async () => {
      const error = new HttpErrorResponse({ status: 500 });
      (api.getAwaiting as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
      const promise = firstValueFrom(effects.loadAwaiting$.pipe(take(1)));
      actions$.next(A.loadAwaiting());
      expect(await promise).toEqual(A.loadAwaitingFailure({ error }));
    });

    it('loadInProgress$ uses branchId from the store', async () => {
      (api.getMine as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
      const promise = firstValueFrom(effects.loadInProgress$.pipe(take(1)));
      actions$.next(A.loadInProgress());
      expect(await promise).toEqual(A.loadInProgressNotModified());
      expect(api.getMine).toHaveBeenCalledWith(7);
    });

    it('loadInProgress$ → Success with items', async () => {
      const items = [{ id: 1, attentionBox: 1, extractorId: 99, extractorFullName: 'Juan' }];
      (api.getMine as ReturnType<typeof vi.fn>).mockReturnValue(of(items));
      const promise = firstValueFrom(effects.loadInProgress$.pipe(take(1)));
      actions$.next(A.loadInProgress());
      expect(await promise).toEqual(A.loadInProgressSuccess({ items: items as never }));
    });

    it('loadStats$ maps stats payload', async () => {
      const stats = { queueSize: 3, averageWaitMinutes: 7, finishedTodayByMe: 1 };
      (api.getStats as ReturnType<typeof vi.fn>).mockReturnValue(of(stats));
      const promise = firstValueFrom(effects.loadStats$.pipe(take(1)));
      actions$.next(A.loadStats());
      expect(await promise).toEqual(A.loadStatsSuccess({ stats }));
    });

    it('loadOccupancy$ maps occupancy payload', async () => {
      const rows = [{
        box: 1, extractorId: 99, extractorFullName: 'Juan', attentionId: 1, attentionNumber: 'A-1',
      }];
      (api.getBoxOccupancy as ReturnType<typeof vi.fn>).mockReturnValue(of(rows));
      const promise = firstValueFrom(effects.loadOccupancy$.pipe(take(1)));
      actions$.next(A.loadOccupancy());
      expect(await promise).toEqual(A.loadOccupancySuccess({ items: rows as never }));
    });

    it('loadBoxAssignments$ → Success on data', async () => {
      const items = [{ boxNumber: 1, extractorId: null, extractorFullName: null }];
      (api.getBoxAssignments as ReturnType<typeof vi.fn>).mockReturnValue(of(items));
      const promise = firstValueFrom(effects.loadBoxAssignments$.pipe(take(1)));
      actions$.next(A.loadBoxAssignments());
      expect(await promise).toEqual(A.loadBoxAssignmentsSuccess({ items: items as never }));
      expect(api.getBoxAssignments).toHaveBeenCalledWith(7);
    });

    it('loadBoxAssignments$ → NotModified on sentinel', async () => {
      (api.getBoxAssignments as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
      const promise = firstValueFrom(effects.loadBoxAssignments$.pipe(take(1)));
      actions$.next(A.loadBoxAssignments());
      expect(await promise).toEqual(A.loadBoxAssignmentsNotModified());
    });

    it('loadBoxAssignments$ → Failure on http error', async () => {
      const error = new HttpErrorResponse({ status: 500 });
      (api.getBoxAssignments as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
      const promise = firstValueFrom(effects.loadBoxAssignments$.pipe(take(1)));
      actions$.next(A.loadBoxAssignments());
      expect(await promise).toEqual(A.loadBoxAssignmentsFailure({ error }));
    });

    it('loadBranchExtractors$ → Success on data', async () => {
      const items = [{ id: 99, fullName: 'Juan Pérez' }];
      (api.getBranchExtractors as ReturnType<typeof vi.fn>).mockReturnValue(of(items));
      const promise = firstValueFrom(effects.loadBranchExtractors$.pipe(take(1)));
      actions$.next(A.loadBranchExtractors());
      expect(await promise).toEqual(A.loadBranchExtractorsSuccess({ items: items as never }));
      expect(api.getBranchExtractors).toHaveBeenCalledWith(7);
    });

    it('loadBranchExtractors$ → NotModified on sentinel', async () => {
      (api.getBranchExtractors as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
      const promise = firstValueFrom(effects.loadBranchExtractors$.pipe(take(1)));
      actions$.next(A.loadBranchExtractors());
      expect(await promise).toEqual(A.loadBranchExtractorsNotModified());
    });

    it('refreshAll$ dispatches the 5 loads (v3: includes loadBoxAssignments + loadInProgress)', async () => {
      const promise = firstValueFrom(effects.refreshAll$.pipe(take(5), toArray()));
      actions$.next(A.refreshAll());
      const out = await promise;
      expect(out).toEqual([
        A.loadAwaiting(),
        A.loadInProgress(),
        A.loadStats(),
        A.loadOccupancy(),
        A.loadBoxAssignments(),
      ]);
    });

    it('setSelectedBranch triggers refreshAll + loadBranchExtractors + loadBoxAssignments', async () => {
      const promise = firstValueFrom(effects.branchChangeRefresh$.pipe(take(3), toArray()));
      actions$.next(A.setSelectedBranch({ branchId: 9 }));
      const out = await promise;
      expect(out).toEqual([
        A.refreshAll(),
        A.loadBranchExtractors(),
        A.loadBoxAssignments(),
      ]);
    });

    it('assignExtractor$ Success stores lastAssigned payload and triggers mutationRefresh$', async () => {
      (api.assignExtractor as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
      const collected = firstValueFrom(effects.mutationRefresh$.pipe(take(1)));
      const assignOut = firstValueFrom(effects.assignExtractor$.pipe(take(1)));
      actions$.next(A.assignExtractor({ id: 10, boxNumber: 2, branchId: 7 }));
      const success = await assignOut;
      expect(success).toEqual(A.assignExtractorSuccess({
        attentionId: 10,
        boxNumber: 2,
        extractorFullName: 'Juan Pérez',
      }));
      actions$.next(success);
      expect(await collected).toEqual(A.refreshAll());
      expect(api.assignExtractor).toHaveBeenCalledWith(10, 2, 7);
    });

    it('assignExtractor$ Failure 409 triggers error toast with the friendly message', async () => {
      const error = new HttpErrorResponse({ status: 409 });
      (api.assignExtractor as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));

      const failurePromise = firstValueFrom(effects.assignExtractor$.pipe(take(1)));
      const toastPromise = firstValueFrom(effects.mutationToasts$.pipe(take(1)));
      actions$.next(A.assignExtractor({ id: 10, boxNumber: 2, branchId: 7 }));

      const failure = await failurePromise;
      expect(failure).toEqual(A.assignExtractorFailure({ error }));
      actions$.next(failure);
      await toastPromise;
      expect(notifier.error).toHaveBeenCalledWith(
        'El box que elegiste está ocupado por otro extractor. Cambiá de box.',
      );
    });

    it('unassignExtraction$ Success emits unassignExtractionSuccess', async () => {
      (api.unassignExtraction as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
      const promise = firstValueFrom(effects.unassignExtraction$.pipe(take(1)));
      actions$.next(A.unassignExtraction({ id: 5 }));
      expect(await promise).toEqual(A.unassignExtractionSuccess({ id: 5 }));
      expect(api.unassignExtraction).toHaveBeenCalledWith(5);
    });

    it('unassignExtraction$ Failure emits unassignExtractionFailure', async () => {
      const error = new HttpErrorResponse({ status: 400 });
      (api.unassignExtraction as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
      const promise = firstValueFrom(effects.unassignExtraction$.pipe(take(1)));
      actions$.next(A.unassignExtraction({ id: 5 }));
      expect(await promise).toEqual(A.unassignExtractionFailure({ error }));
    });

    it('saveBoxAssignments$ Success emits saveBoxAssignmentsSuccess', async () => {
      const result = [{ boxNumber: 1, extractorId: 99, extractorFullName: 'Juan' }];
      (api.saveBoxAssignments as ReturnType<typeof vi.fn>).mockReturnValue(of(result));
      const promise = firstValueFrom(effects.saveBoxAssignments$.pipe(take(1)));
      actions$.next(A.saveBoxAssignments({ boxes: [{ boxNumber: 1, extractorUserId: 99 }] }));
      expect(await promise).toEqual(A.saveBoxAssignmentsSuccess({ items: result as never }));
      expect(api.saveBoxAssignments).toHaveBeenCalledWith(7, [{ boxNumber: 1, extractorUserId: 99 }]);
    });

    it('saveBoxAssignments$ Failure emits saveBoxAssignmentsFailure', async () => {
      const error = new HttpErrorResponse({ status: 400 });
      (api.saveBoxAssignments as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));
      const promise = firstValueFrom(effects.saveBoxAssignments$.pipe(take(1)));
      actions$.next(A.saveBoxAssignments({ boxes: [] }));
      expect(await promise).toEqual(A.saveBoxAssignmentsFailure({ error }));
    });

    it('cancelExtraction$ success emits cancelExtractionSuccess and passes reason', async () => {
      (api.cancelExtraction as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
      const promise = firstValueFrom(effects.cancelExtraction$.pipe(take(1)));
      actions$.next(A.cancelExtraction({ id: 5, reason: 'paciente se fue' }));
      expect(await promise).toEqual(A.cancelExtractionSuccess({ id: 5 }));
      expect(api.cancelExtraction).toHaveBeenCalledWith(5, 'paciente se fue');
    });

    it('endExtraction$ success emits endExtractionSuccess', async () => {
      (api.endExtraction as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
      const promise = firstValueFrom(effects.endExtraction$.pipe(take(1)));
      actions$.next(A.endExtraction({ id: 8 }));
      expect(await promise).toEqual(A.endExtractionSuccess({ id: 8 }));
    });

    it('branchAccessDenied$ on a 403 failure resets the selected branch', async () => {
      const error = new HttpErrorResponse({ status: 403 });
      const promise = firstValueFrom(effects.branchAccessDenied$.pipe(take(1)));
      actions$.next(A.loadAwaitingFailure({ error }));
      expect(await promise).toEqual(A.setSelectedBranch({ branchId: null }));
      expect(notifier.error).toHaveBeenCalled();
      expect(boxService.setSelectedBranch).toHaveBeenCalledWith(null);
    });

    it('mutationRefresh$ fires on unassignExtractionSuccess', async () => {
      const collected = firstValueFrom(effects.mutationRefresh$.pipe(take(1)));
      actions$.next(A.unassignExtractionSuccess({ id: 1 }));
      expect(await collected).toEqual(A.refreshAll());
    });
  });

  describe('without a selected branch', () => {
    beforeEach(() => setup(null));

    it('refreshAll$ does nothing when there is no branch', async () => {
      let emitted = 0;
      const sub = effects.refreshAll$.subscribe(() => emitted++);
      actions$.next(A.refreshAll());
      await Promise.resolve();
      sub.unsubscribe();
      expect(emitted).toBe(0);
    });

    it('loadAwaiting$ does not call the api when branch is null', async () => {
      let emitted = 0;
      const sub = effects.loadAwaiting$.subscribe(() => emitted++);
      actions$.next(A.loadAwaiting());
      await Promise.resolve();
      sub.unsubscribe();
      expect(emitted).toBe(0);
      expect(api.getAwaiting).not.toHaveBeenCalled();
    });

    it('loadInProgress$ does not call the api when branch is null', async () => {
      let emitted = 0;
      const sub = effects.loadInProgress$.subscribe(() => emitted++);
      actions$.next(A.loadInProgress());
      await Promise.resolve();
      sub.unsubscribe();
      expect(emitted).toBe(0);
      expect(api.getMine).not.toHaveBeenCalled();
    });

    it('loadBoxAssignments$ does not call the api when branch is null', async () => {
      let emitted = 0;
      const sub = effects.loadBoxAssignments$.subscribe(() => emitted++);
      actions$.next(A.loadBoxAssignments());
      await Promise.resolve();
      sub.unsubscribe();
      expect(emitted).toBe(0);
      expect(api.getBoxAssignments).not.toHaveBeenCalled();
    });

    it('saveBoxAssignments$ does nothing when branch is null', async () => {
      let emitted = 0;
      const sub = effects.saveBoxAssignments$.subscribe(() => emitted++);
      actions$.next(A.saveBoxAssignments({ boxes: [] }));
      await Promise.resolve();
      sub.unsubscribe();
      expect(emitted).toBe(0);
    });
  });

  it('loadBranches$ → Success on data', async () => {
    setup(null);
    (api.getMyBranches as ReturnType<typeof vi.fn>).mockReturnValue(of([
      { id: 1, code: 'NORTE', name: 'Sucursal Norte' },
    ]));
    const promise = firstValueFrom(effects.loadBranches$.pipe(take(1)));
    actions$.next(A.loadBranches());
    expect(await promise).toEqual(A.loadBranchesSuccess({
      items: [{ id: 1, code: 'NORTE', name: 'Sucursal Norte' }],
    }));
  });

  it('loadBranches$ → NotModified action on sentinel', async () => {
    setup(null);
    (api.getMyBranches as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    const promise = firstValueFrom(effects.loadBranches$.pipe(take(1)));
    actions$.next(A.loadBranches());
    expect(await promise).toEqual(A.loadBranchesNotModified());
  });
});
