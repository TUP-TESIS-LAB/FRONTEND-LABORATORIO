import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { selectDetalle } from './validacion-detalle.selectors';
import { loadDetalle, loadDetalleSuccess, loadDetalleFailure, validarDet, validarTodo, mutarOk, mutarFail, firmarResultado, firmarEstudio } from './validacion-detalle.actions';

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

  validarDet$ = createEffect(() => this.actions$.pipe(
    ofType(validarDet),
    concatMap(({ resultId, determinationId, outcome }) =>
      this.api.validateDetermination(resultId, determinationId, outcome).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
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

  firmarEstudio$ = createEffect(() => this.actions$.pipe(
    ofType(firmarEstudio),
    concatMap(({ protocolId }) =>
      this.api.signStudy(protocolId).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  reload$ = createEffect(() => this.actions$.pipe(
    ofType(mutarOk),
    withLatestFrom(this.store.select(selectDetalle)),
    filter(([, d]) => d != null),
    map(([, d]) => loadDetalle({ protocolId: d!.study.protocolId, patientName: d!.patientName, patientSex: d!.patientSex, patientBirthDate: d!.patientBirthDate })),
  ));
}
