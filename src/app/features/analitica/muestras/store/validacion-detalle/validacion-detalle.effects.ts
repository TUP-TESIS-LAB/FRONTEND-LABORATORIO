import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { concat, of } from 'rxjs';
import { catchError, concatMap, filter, last, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { selectDetalle } from './validacion-detalle.selectors';
import { loadDetalle, loadDetalleSuccess, loadDetalleFailure, validarTodo, mutarOk, mutarFail, firmarResultado, firmarEstudio } from './validacion-detalle.actions';

@Injectable()
export class ValidacionDetalleEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(loadDetalle),
    switchMap(({ protocolId, patientName, patientSex, patientBirthDate }) =>
      this.api.getDetalle(protocolId).pipe(
        map(res => loadDetalleSuccess({ detalle: { ...res, patientName, patientSex, patientBirthDate } })),
        catchError((error: HttpErrorResponse) => of(loadDetalleFailure({ error }))))),
  ));

  validarTodo$ = createEffect(() => this.actions$.pipe(
    ofType(validarTodo),
    concatMap(({ resultId, outcome }) =>
      this.api.validateAll(resultId, outcome).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  firmarResultado$ = createEffect(() => this.actions$.pipe(
    ofType(firmarResultado),
    concatMap(({ resultId }) =>
      this.api.signResult(resultId).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  /**
   * GAP-9: el modal de "Firmar estudio" orquesta la firma real. El estado de firma
   * del backend es derivado (no hay endpoint de "firma parcial"): se firma cada
   * resultado VALIDATED uno a uno (results/{id}/sign) y, si con eso quedan TODOS los
   * resultados firmados, se cierra el estudio (studies/{protocolId}/sign → CLOSED).
   * Si faltaba alguno por validar, el estudio queda PARTIALLY_SIGNED.
   */
  firmarEstudio$ = createEffect(() => this.actions$.pipe(
    ofType(firmarEstudio),
    withLatestFrom(this.store.select(selectDetalle)),
    concatMap(([{ protocolId }, detalle]) => {
      const results = detalle?.results ?? [];
      const toSign = results.filter(r => r.status === 'VALIDATED').map(r => r.resultId);
      const yaFirmados = results.filter(r => r.status === 'SIGNED').length;
      const total = detalle?.study.expectedResultsCount ?? results.length;
      const quedanTodosFirmados = yaFirmados + toSign.length >= total && total > 0;

      const signResults$ = toSign.map(id => this.api.signResult(id));
      const ops = quedanTodosFirmados
        ? [...signResults$, this.api.signStudy(protocolId)]
        : signResults$;

      if (ops.length === 0) return of(mutarOk());
      return concat(...ops).pipe(
        last(),
        map(() => mutarOk()),
        catchError((error: HttpErrorResponse) => of(mutarFail({ error }))));
    }),
  ));

  reload$ = createEffect(() => this.actions$.pipe(
    ofType(mutarOk),
    withLatestFrom(this.store.select(selectDetalle)),
    filter(([, d]) => d != null),
    map(([, d]) => loadDetalle({ protocolId: d!.study.protocolId, patientName: d!.patientName, patientSex: d!.patientSex, patientBirthDate: d!.patientBirthDate })),
  ));
}
