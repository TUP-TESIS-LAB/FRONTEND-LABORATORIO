import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, ReplaySubject, firstValueFrom, of, throwError } from 'rxjs';
import { NOT_MODIFIED } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { AnaliticaMetricsApiService } from '../../services/analitica-metrics-api.service';
import { loadVolumenTab, loadVolumenTabFailure, loadVolumenTabSuccess } from './analitica-metrics.actions';
import { AnaliticaMetricsEffects } from './analitica-metrics.effects';
import { ANALITICA_METRICS_FEATURE_KEY, initialAnaliticaMetricsState, initialVolumenTabData } from './analitica-metrics.state';

const filter = { dateFrom: '2026-06-01', dateTo: '2026-06-30', granularity: 'DAY' as const };
const kpi = { key: 'volumen-total', label: 'Volumen total', value: 100, unit: 'determinaciones' };
const breakdown = { dimension: 'seccion', slices: [{ key: 'bioquimica', label: 'Bioquímica', value: 40 }] };
const demografia = { porEdad: breakdown, porGenero: breakdown };

describe('AnaliticaMetricsEffects — loadVolumenTab$', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof AnaliticaMetricsApiService, ReturnType<typeof vi.fn>>>;
  let notifier: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let effects: AnaliticaMetricsEffects;

  function setup(prevVolumen = initialVolumenTabData): void {
    actions$ = new ReplaySubject(1);
    api = {
      getVolumen: vi.fn(),
      getVolumenPorSeccion: vi.fn(),
      getDemografia: vi.fn(),
      getSubEstados: vi.fn(),
    };
    notifier = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AnaliticaMetricsEffects,
        provideMockActions(() => actions$ as unknown as Observable<Action>),
        provideMockStore({
          initialState: {
            [ANALITICA_METRICS_FEATURE_KEY]: { ...initialAnaliticaMetricsState, volumen: prevVolumen },
          },
        }),
        { provide: AnaliticaMetricsApiService, useValue: api },
        { provide: NotificationService, useValue: notifier },
      ],
    });
    effects = TestBed.inject(AnaliticaMetricsEffects);
  }

  it('despacha loadVolumenTabSuccess con los 4 recursos resueltos', async () => {
    setup();
    (api.getVolumen as ReturnType<typeof vi.fn>).mockReturnValue(of({ kpi, series: { labels: [], datasets: [] } }));
    (api.getVolumenPorSeccion as ReturnType<typeof vi.fn>).mockReturnValue(of(breakdown));
    (api.getDemografia as ReturnType<typeof vi.fn>).mockReturnValue(of(demografia));
    (api.getSubEstados as ReturnType<typeof vi.fn>).mockReturnValue(of(breakdown));

    const result = firstValueFrom(effects.loadVolumenTab$);
    actions$.next(loadVolumenTab({ filter }));

    expect(await result).toEqual(loadVolumenTabSuccess({
      data: { volumen: { kpi, series: { labels: [], datasets: [] } }, volumenPorSeccion: breakdown, demografia, subEstados: breakdown },
    }));
  });

  it('un 304 (NotModified) en un recurso cae al valor previo del state, no lo pisa', async () => {
    const prevVolumen = { volumen: { kpi, series: { labels: [], datasets: [] } }, volumenPorSeccion: breakdown, demografia, subEstados: breakdown };
    setup(prevVolumen);
    // Solo `subEstados` trae datos nuevos esta vez; el resto responde 304.
    const nuevoSubEstados = { dimension: 'seccion', slices: [{ key: 'hematologia', label: 'Hematología', value: 12 }] };
    (api.getVolumen as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    (api.getVolumenPorSeccion as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    (api.getDemografia as ReturnType<typeof vi.fn>).mockReturnValue(of(NOT_MODIFIED));
    (api.getSubEstados as ReturnType<typeof vi.fn>).mockReturnValue(of(nuevoSubEstados));

    const result = firstValueFrom(effects.loadVolumenTab$);
    actions$.next(loadVolumenTab({ filter }));
    const action = await result;

    expect(action).toEqual(loadVolumenTabSuccess({
      data: { ...prevVolumen, subEstados: nuevoSubEstados },
    }));
  });

  it('un error HTTP despacha loadVolumenTabFailure y notifica en español', async () => {
    setup();
    (api.getVolumen as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    (api.getVolumenPorSeccion as ReturnType<typeof vi.fn>).mockReturnValue(of(breakdown));
    (api.getDemografia as ReturnType<typeof vi.fn>).mockReturnValue(of(demografia));
    (api.getSubEstados as ReturnType<typeof vi.fn>).mockReturnValue(of(breakdown));

    const result = firstValueFrom(effects.loadVolumenTab$);
    actions$.next(loadVolumenTab({ filter }));
    const action = await result;

    expect(action).toEqual(loadVolumenTabFailure({ error: 'No tenés acceso a la sucursal seleccionada.' }));
    expect(notifier.error).toHaveBeenCalledWith('No tenés acceso a la sucursal seleccionada.');
  });
});
