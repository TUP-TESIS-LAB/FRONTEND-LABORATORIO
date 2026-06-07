import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, catchError, concatMap, exhaustMap, forkJoin, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { PatientService } from '../../../pacientes/services/patient.service';
import { AtencionApiService } from '../../services/atencion-api.service';
import { AnalysisService } from '../../services/analysis.service';
import { LabelsService } from '../../services/labels.service';
import { RotuloPdfService } from '../../services/rotulo-pdf.service';
import { NotificationService } from '@core/services/notification.service';
import { Analysis } from '../../models/atencion.model';
import {
  addAnalysisList,
  addObservations,
  addPayment,
  assignGeneralData,
  atencionMutationFailure,
  atencionMutationSuccess,
  attentionAnalysesFailure,
  attentionAnalysesLoaded,
  cancelAtencion,
  createBlankAtencion,
  createPatientInline,
  createPreFilledAtencion,
  downloadProtocolLabels,
  endBilling,
  endCollection,
  endSecretaryPhase,
  loadAtencion,
  loadAtencionFailure,
  loadAtencionSuccess,
  loadAtenciones,
  loadAtencionesFailure,
  loadAtencionesSuccess,
  loadAttentionAnalyses,
  loadAttentionPatient,
  loadPricing,
  loadPricingFailure,
  loadPricingSuccess,
  patientNotFound,
  patientResolutionFailure,
  patientResolved,
  resolvePatientByDni,
  returnPhase,
  setCopayment,
  setCopaymentFailure,
  setCopaymentSuccess,
  startAttentionForPatient,
  updatePatientInline,
  removeAnalysisFromResumen,
  removeAnalysisFromResumenSuccess,
  removeAnalysisFromResumenFailure,
  verifyPatient,
  verifyPatientSuccess,
  verifyPatientFailure,
} from './atencion.actions';

/**
 * Política de operadores RxJS:
 * - GET (load list, load detail): `switchMap` — la última pedida cancela las previas
 *   (el usuario quiere el resultado más reciente).
 * - Mutaciones (PATCH/POST): `concatMap` — encolamos para preservar el orden y evitar
 *   que un doble-click cancele una mutación en vuelo. Esto es crítico para los chains
 *   del wizard (addPayment → endCollection, addAnalysisList → endSecretaryPhase).
 *   `exhaustMap` también previene doble-click pero ignora los click extra; `concatMap`
 *   los procesa secuencialmente, que es lo que necesita el wizard.
 * Aborda FE-9 del review.
 */
@Injectable()
export class AtencionEffects {
  private readonly actions$      = inject(Actions);
  private readonly api           = inject(AtencionApiService);
  private readonly patients      = inject(PatientService);
  private readonly router        = inject(Router);
  private readonly analysis      = inject(AnalysisService);
  private readonly labels        = inject(LabelsService);
  private readonly rotuloPdf     = inject(RotuloPdfService);
  private readonly notification  = inject(NotificationService);
  private readonly branchCtx     = inject(OperatorBranchContextService);

  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAtenciones),
      switchMap(() =>
        this.api.list().pipe(
          map(items => loadAtencionesSuccess({ items })),
          catchError((error: HttpErrorResponse) => of(loadAtencionesFailure({ error })))
        )
      )
    )
  );

  loadDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAtencion),
      switchMap(({ id }) =>
        this.api.getById(id).pipe(
          map(item => loadAtencionSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(loadAtencionFailure({ error })))
        )
      )
    )
  );

  createBlank$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createBlankAtencion),
      exhaustMap(({ payload }) =>
        this.api.createBlank(payload).pipe(
          tap(item => this.router.navigate(['/analitica/atencion', item.id])),
          map(item => atencionMutationSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
        )
      )
    )
  );

  createPrefilled$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createPreFilledAtencion),
      exhaustMap(({ payload }) =>
        this.api.createPreFilled(payload).pipe(
          tap(item => this.router.navigate(['/analitica/atencion', item.id])),
          map(item => atencionMutationSuccess({ item })),
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
        )
      )
    )
  );

  assignGeneralData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(assignGeneralData),
      concatMap(({ id, payload }) => this.api.assignGeneralData(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addAnalysis$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addAnalysisList),
      concatMap(({ id, payload }) => this.api.addAnalysis(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addPayment),
      concatMap(({ id, payload }) => this.api.addPayment(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endCollection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endCollection),
      concatMap(({ id }) => this.api.endCollection(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endBilling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endBilling),
      concatMap(({ id }) => this.api.endBilling(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  endSecretaryPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(endSecretaryPhase),
      concatMap(({ id }) => this.api.endSecretaryPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  returnPhase$ = createEffect(() =>
    this.actions$.pipe(
      ofType(returnPhase),
      exhaustMap(({ id }) => this.api.returnPhase(id).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  cancel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelAtencion),
      exhaustMap(({ id, payload }) => this.api.cancel(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  addObservations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addObservations),
      concatMap(({ id, payload }) => this.api.addObservations(id, payload).pipe(
        map(item => atencionMutationSuccess({ item })),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error })))
      ))
    )
  );

  resolvePatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolvePatientByDni),
      switchMap(({ dni }) =>
        this.patients.existsByDni(dni).pipe(
          switchMap(exists =>
            exists
              ? this.patients.getByDni(dni).pipe(map(patient => patientResolved({ patient })))
              : of(patientNotFound({ dni }))),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  createPatientInline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createPatientInline),
      concatMap(({ payload }) =>
        this.patients.create(payload).pipe(
          map(patient => patientResolved({ patient })),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  updatePatientInline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updatePatientInline),
      concatMap(({ id, payload }) =>
        this.patients.update(id, payload).pipe(
          map(patient => patientResolved({ patient })),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  startAttentionForPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startAttentionForPatient),
      exhaustMap(({ patientId, indications }) => {
        // branchId real: la sucursal seleccionada del operador (no hardcodeado).
        const branchId = this.branchCtx.branchId();
        if (branchId == null) {
          this.notification.error('Elegí una sucursal arriba antes de crear la atención.');
          return EMPTY;
        }
        // TODO(KAN-77): attentionNumber sin colisión (hoy basado en timestamp).
        return this.api.createBlank({ branchId, patientId, attentionNumber: `A-${Date.now().toString().slice(-6)}`, deskAttentionBox: null }).pipe(
          concatMap(created =>
            this.api.assignGeneralData(created.id, { patientId, doctorId: null, insurancePlanId: null, indications }).pipe(
              tap(item => this.router.navigate(['/analitica/atencion', item.id])),
              map(item => atencionMutationSuccess({ item })))),
          // Si createBlank ok pero assignGeneralData falla, queda una atención en blanco en estado
          // REGISTERING_GENERAL_DATA (sin paciente ni datos). El usuario puede reintentar; aceptable
          // por ahora — no compensamos con cancel.
          catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error }))),
        );
      })));

  loadAttentionPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAttentionPatient),
      switchMap(({ patientId }) =>
        this.patients.getById(patientId).pipe(
          map(patient => patientResolved({ patient })),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  loadAttentionAnalyses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAttentionAnalyses),
      switchMap(({ analysisIds }) =>
        (analysisIds.length === 0
          ? of([] as Analysis[])
          : forkJoin(analysisIds.map(id => this.analysis.getById(id)))
        ).pipe(
          map(analyses => attentionAnalysesLoaded({ analyses })),
          catchError((error: HttpErrorResponse) => of(attentionAnalysesFailure({ error }))),
        ))));

  downloadProtocolLabels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(downloadProtocolLabels),
      switchMap(({ protocolId, protocolNumber }) =>
        this.labels.getByProtocol(protocolId).pipe(
          tap(ls => {
            if (ls.length === 0) {
              this.notification.error('Sin rótulos', 'Este protocolo todavía no tiene rótulos generados.');
            } else {
              this.rotuloPdf.generate(protocolNumber, ls).catch(() =>
                this.notification.error('No se pudieron generar los rótulos', 'Reintentá en un momento.'),
              );
            }
          }),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudieron generar los rótulos', 'Reintentá en un momento.');
            return of(error);
          }),
        )),
    ), { dispatch: false });

  loadPricing$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPricing),
      switchMap(({ attentionId }) =>
        this.api.getPricing(attentionId).pipe(
          map(pricing => loadPricingSuccess({ pricing })),
          catchError((error: HttpErrorResponse) => {
            // Surface the "no particular plan" message as a toast; other errors are silent.
            const msg: string = (error.error as { message?: string } | null)?.message ?? '';
            if (msg) {
              this.notification.error(msg);
            }
            return of(loadPricingFailure({ error }));
          }),
        )
      )
    )
  );

  setCopayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setCopayment),
      concatMap(({ attentionId, copaymentAmount }) =>
        this.api.setCopayment(attentionId, { copaymentAmount }).pipe(
          mergeMap(item => [
            setCopaymentSuccess({ item }),
            loadPricing({ attentionId }),
          ]),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo guardar el copago. Revisá la conexión y volvé a intentarlo.');
            return of(setCopaymentFailure({ error }));
          }),
        )
      )
    )
  );

  verifyPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(verifyPatient),
      exhaustMap(({ id }) =>
        this.patients.verify(id).pipe(
          map(patient => verifyPatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(verifyPatientFailure({ error }))),
        ),
      ),
    ),
  );

  /**
   * Quitar un análisis del resumen (B3c).
   *
   * Llama al endpoint de addAnalysis con la lista reducida (el backend
   * soft-delete-all y re-inserta), luego refresca análisis + pricing.
   * El refresh ocurre DENTRO del mergeMap para garantizar que no haya race
   * condition: loadAttentionAnalyses y loadPricing se despachan sólo si el
   * PATCH tuvo éxito.
   *
   * Usamos concatMap (no switchMap) para que si el usuario quitara dos
   * análisis muy rápido, la segunda petición espere a la primera.
   */
  removeAnalysisFromResumen$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeAnalysisFromResumen),
      concatMap(({ attentionId, payload }) =>
        this.api.addAnalysis(attentionId, payload).pipe(
          mergeMap(item => [
            removeAnalysisFromResumenSuccess({ item }),
            loadAttentionAnalyses({ analysisIds: item.analysisAuthorizations.map(a => a.analysisId) }),
            loadPricing({ attentionId }),
          ]),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo quitar el análisis. Revisá la conexión y volvé a intentarlo.');
            return of(removeAnalysisFromResumenFailure({ error }));
          }),
        )
      )
    )
  );
}
