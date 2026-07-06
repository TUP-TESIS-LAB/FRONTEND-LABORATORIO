import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { ValidacionDetalleEffects } from './validacion-detalle.effects';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { NotificationService } from '@core/services/notification.service';
import { selectDetalle } from './validacion-detalle.selectors';
import { verPdf, verPdfSuccess, verPdfFailure } from './validacion-detalle.actions';

describe('ValidacionDetalleEffects — verPdf', () => {
  let actions$: Observable<Action>;
  let api: any;
  let notifications: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = { getStudyReports: vi.fn(), downloadReport: vi.fn() };
    notifications = { error: vi.fn(), success: vi.fn() };
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    // jsdom no implementa createObjectURL.
    (URL as any).createObjectURL = vi.fn(() => 'blob:fake');

    TestBed.configureTestingModule({
      providers: [
        ValidacionDetalleEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: selectDetalle, value: null }] }),
        { provide: PostanaliticaApiService, useValue: api },
        { provide: NotificationService, useValue: notifications },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('verPdf$ descarga el informe de mayor versión, lo abre y emite success', async () => {
    api.getStudyReports.mockReturnValue(of([
      { id: 10, versionNumber: 1, reportType: 'PATIENT' },
      { id: 11, versionNumber: 2, reportType: 'PATIENT' },
    ]));
    api.downloadReport.mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    actions$ = of(verPdf({ protocolId: 50015 }));

    const effects = TestBed.inject(ValidacionDetalleEffects);
    const action = await firstValueFrom(effects.verPdf$);

    expect(api.downloadReport).toHaveBeenCalledWith(50015, 11); // versión más alta
    expect(openSpy).toHaveBeenCalledWith('blob:fake', '_blank');
    expect(action).toEqual(verPdfSuccess());
  });

  it('verPdf$ sin informes → failure (no abre nada)', async () => {
    api.getStudyReports.mockReturnValue(of([]));
    actions$ = of(verPdf({ protocolId: 50015 }));

    const effects = TestBed.inject(ValidacionDetalleEffects);
    const action = await firstValueFrom(effects.verPdf$);

    expect(api.downloadReport).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(action.type).toBe('[Postanalitica API] Ver PDF Failure');
  });

  it('verPdf$ error de descarga → failure con el error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getStudyReports.mockReturnValue(of([{ id: 10, versionNumber: 1, reportType: 'PATIENT' }]));
    api.downloadReport.mockReturnValue(throwError(() => error));
    actions$ = of(verPdf({ protocolId: 50015 }));

    const effects = TestBed.inject(ValidacionDetalleEffects);
    const action = await firstValueFrom(effects.verPdf$);

    expect(action).toEqual(verPdfFailure({ error }));
  });

  it('verPdfFailureToast$ muestra un toast en español sin leak de internals', async () => {
    const error = new HttpErrorResponse({ status: 403 });
    actions$ = of(verPdfFailure({ error }));

    const effects = TestBed.inject(ValidacionDetalleEffects);
    await firstValueFrom(effects.verPdfFailureToast$);

    expect(notifications.error).toHaveBeenCalledTimes(1);
    const [summary, detail] = notifications.error.mock.calls[0];
    expect(summary).toBe('No se pudo abrir el informe');
    expect(detail).toBe('No tenés permiso para ver el informe de este estudio.');
    expect(detail).not.toMatch(/lab\.|java\.|Exception|No enum constant/);
  });
});
