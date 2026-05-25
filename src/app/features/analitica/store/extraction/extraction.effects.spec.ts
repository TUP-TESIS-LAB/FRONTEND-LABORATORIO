import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { NOT_MODIFIED } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { ExtractorAttentionService } from '../../services/extractor-attention.service';
import * as A from './extraction.actions';
import { ExtractionEffects } from './extraction.effects';

describe('ExtractionEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof ExtractorAttentionService, ReturnType<typeof vi.fn>>>;
  let notifier: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let effects: ExtractionEffects;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    api = {
      getAwaiting: vi.fn(),
      getMine: vi.fn(),
      getStats: vi.fn(),
      assignExtractor: vi.fn(),
      cancelExtraction: vi.fn(),
      endExtraction: vi.fn(),
    };
    notifier = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ExtractionEffects,
        provideMockActions(() => actions$ as unknown as Observable<Action>),
        { provide: ExtractorAttentionService, useValue: api },
        { provide: NotificationService, useValue: notifier },
      ],
    });
    effects = TestBed.inject(ExtractionEffects);
  });

  it('loadAwaiting$ → Success on data', async () => {
    (api.getAwaiting as ReturnType<typeof vi.fn>).mockReturnValue(of([{ id: 1 }]));
    const promise = firstValueFrom(effects.loadAwaiting$.pipe(take(1)));
    actions$.next(A.loadAwaiting());
    expect(await promise).toEqual(A.loadAwaitingSuccess({ items: [{ id: 1 }] as never }));
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

  it('loadMine$ NotModified sentinel maps to loadMineNotModified', async () => {
    (api.getMine as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    const promise = firstValueFrom(effects.loadMine$.pipe(take(1)));
    actions$.next(A.loadMine());
    expect(await promise).toEqual(A.loadMineNotModified());
  });

  it('loadStats$ maps stats payload', async () => {
    const stats = { queueSize: 3, averageWaitMinutes: 7, finishedTodayByMe: 1 };
    (api.getStats as ReturnType<typeof vi.fn>).mockReturnValue(of(stats));
    const promise = firstValueFrom(effects.loadStats$.pipe(take(1)));
    actions$.next(A.loadStats());
    expect(await promise).toEqual(A.loadStatsSuccess({ stats }));
  });

  it('refreshAll$ dispatches the three loads', async () => {
    const promise = firstValueFrom(effects.refreshAll$.pipe(take(3), toArray()));
    actions$.next(A.refreshAll());
    const out = await promise;
    expect(out).toEqual([A.loadAwaiting(), A.loadMine(), A.loadStats()]);
  });

  it('assignExtractor$ Success triggers a refreshAll via mutationRefresh$', async () => {
    (api.assignExtractor as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
    const collected = firstValueFrom(effects.mutationRefresh$.pipe(take(1)));
    // Both effects subscribe to actions$; we need to push the trigger AND let the
    // assign effect emit Success first which then flows into mutationRefresh$.
    const assignOut = firstValueFrom(effects.assignExtractor$.pipe(take(1)));
    actions$.next(A.assignExtractor({ id: 10, box: 2 }));
    const success = await assignOut;
    expect(success).toEqual(A.assignExtractorSuccess({ id: 10 }));
    actions$.next(success);
    expect(await collected).toEqual(A.refreshAll());
  });

  it('assignExtractor$ Failure 409 triggers error toast with the friendly message', async () => {
    const error = new HttpErrorResponse({ status: 409 });
    (api.assignExtractor as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => error));

    const failurePromise = firstValueFrom(effects.assignExtractor$.pipe(take(1)));
    const toastPromise = firstValueFrom(effects.mutationToasts$.pipe(take(1)));
    actions$.next(A.assignExtractor({ id: 10, box: 2 }));

    const failure = await failurePromise;
    expect(failure).toEqual(A.assignExtractorFailure({ error }));
    actions$.next(failure);
    await toastPromise;
    expect(notifier.error).toHaveBeenCalledWith(
      'Otro extractor tomó este paciente. La cola se actualizó.',
    );
  });

  it('cancelExtraction$ success emits cancelExtractionSuccess', async () => {
    (api.cancelExtraction as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
    const promise = firstValueFrom(effects.cancelExtraction$.pipe(take(1)));
    actions$.next(A.cancelExtraction({ id: 5 }));
    expect(await promise).toEqual(A.cancelExtractionSuccess({ id: 5 }));
  });

  it('endExtraction$ success emits endExtractionSuccess', async () => {
    (api.endExtraction as ReturnType<typeof vi.fn>).mockReturnValue(of(void 0));
    const promise = firstValueFrom(effects.endExtraction$.pipe(take(1)));
    actions$.next(A.endExtraction({ id: 8 }));
    expect(await promise).toEqual(A.endExtractionSuccess({ id: 8 }));
  });
});
