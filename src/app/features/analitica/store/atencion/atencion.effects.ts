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
import { humanizeBackendError } from '@shared/utils/error-messages';
import { Analysis } from '../../models/atencion.model';
import { FamilyLinkService } from '../../services/family-link.service';
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
  setAuthorizationNumber,
  setAuthorizationNumberFailure,
  setAuthorizationNumberSuccess,
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
  loadPatientGuardians,
  loadPatientGuardiansSuccess,
  loadPatientGuardiansFailure,
  validateBond,
  validateBondSuccess,
  validateBondFailure,
  registerGuardian,
  registerGuardianSuccess,
  registerGuardianFailure,
  setUrgentFlag,
  setUrgentFlagSuccess,
  setUrgentFlagFailure,
  advanceUrgent,
  advanceUrgentSuccess,
  advanceUrgentFailure,
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
  private readonly familyLink    = inject(FamilyLinkService);

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
        catchError((error: HttpErrorResponse) => {
          // Sin esto el fallo es invisible: el wizard no avanza y el operador no sabe
          // por qué. Pasa de verdad — escribir el nro. de autorización y hacer clic en
          // "Continuar" encola el PATCH del blur junto con éste sobre la misma atención,
          // y el segundo vuelve 409 ("Otra persona modificó este registro...").
          this.notification.error(
            error?.error?.message ?? 'No se pudieron guardar los análisis. Volvé a intentarlo.');
          return of(atencionMutationFailure({ error }));
        })
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
        catchError((error: HttpErrorResponse) => {
          this.notification.error('No se pudo avanzar a la confirmación. Revisá la conexión y volvé a intentarlo.');
          return of(atencionMutationFailure({ error }));
        })
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
        catchError((error: HttpErrorResponse) => {
          // KAN-246: el rechazo del backend (p. ej. cobro ya registrado) fallaba en
          // silencio — el botón seguía ahí y el click no hacía nada visible.
          this.notification.error(this.returnPhaseErrorMessage(error));
          return of(atencionMutationFailure({ error }));
        })
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
          // Alta manual del laboratorio = constatación: el paciente nace verificado.
          // Reusamos el endpoint verify; si el back lo rechaza (422: faltan datos o
          // cobertura activa) caemos al paciente creado sin verificar, en SILENCIO
          // (no es una acción explícita del usuario, no mostramos toast).
          concatMap(created =>
            this.patients.verify(created.id).pipe(
              map(verified => patientResolved({ patient: verified })),
              catchError(() => of(patientResolved({ patient: created }))),
            )),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  updatePatientInline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updatePatientInline),
      concatMap(({ id, payload }) =>
        this.patients.update(id, payload).pipe(
          // Edición manual del laboratorio = constatación: el paciente queda verificado
          // SIEMPRE (la opción manual "Marcar verificado" se reserva para los pacientes
          // de portal). Reusamos verify y, ante un 422, caemos al paciente actualizado
          // sin verificar en silencio.
          concatMap(updated =>
            this.patients.verify(id).pipe(
              map(verified => patientResolved({ patient: verified })),
              catchError(() => of(patientResolved({ patient: updated }))),
            )),
          catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
        ))));

  startAttentionForPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startAttentionForPatient),
      exhaustMap(({ patientId, doctorId, insurancePlanId, indications, queueEntryId, isUrgent }) => {
        // branchId real: la sucursal seleccionada del operador (no hardcodeado).
        const branchId = this.branchCtx.branchId();
        if (branchId == null) {
          this.notification.error('Elegí una sucursal arriba antes de crear la atención.');
          return EMPTY;
        }
        // TODO(KAN-77): attentionNumber sin colisión (hoy basado en timestamp).
        return this.api.createBlank({ branchId, patientId, attentionNumber: `A-${Date.now().toString().slice(-6)}`, deskAttentionBox: null, queueEntryId, isUrgent }).pipe(
          concatMap(created =>
            this.api.assignGeneralData(created.id, { patientId, doctorId, insurancePlanId, indications }).pipe(
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

  /**
   * Descarga el PDF de rótulos de un protocolo.
   *
   * Cantidad de rótulos = la cantidad de `LabelResponse` que devuelve el backend
   * para el protocolo (uno por label), NO un `printCount` arbitrario del front.
   * Hoy el backend emite un label por análisis autorizado. Si el negocio define
   * que la regla correcta es "uno por tipo de muestra/tubo" (varios análisis que
   * comparten tubo → un solo rótulo), ese agrupamiento se resuelve en la
   * generación de labels del backend; el front sigue renderizando 1:1 lo que recibe.
   * Ver pregunta abierta en el PR.
   */
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

  setAuthorizationNumber$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setAuthorizationNumber),
      concatMap(({ attentionId, authorizationNumber }) =>
        this.api.setAuthorizationNumber(attentionId, { authorizationNumber }).pipe(
          map(item => setAuthorizationNumberSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo guardar el número de autorización. Revisá la conexión y volvé a intentarlo.');
            return of(setAuthorizationNumberFailure({ error }));
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
          catchError((error: HttpErrorResponse) => {
            // Antes el 422 fallaba en silencio: el botón se rehabilitaba pero el
            // usuario no veía por qué. Mostramos un toast mapeado por código HTTP,
            // en español y sin leak de internals.
            this.notification.error(this.verifyErrorMessage(error));
            return of(verifyPatientFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadPatientGuardians$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPatientGuardians),
      switchMap(({ patientId }) =>
        this.familyLink.getGuardians(patientId).pipe(
          map(guardians => loadPatientGuardiansSuccess({ guardians })),
          catchError((error: HttpErrorResponse) => of(loadPatientGuardiansFailure({ error }))),
        ),
      ),
    ),
  );

  validateBond$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateBond),
      concatMap(({ userPatientId, status }) =>
        this.familyLink.verifyBond(userPatientId, status).pipe(
          map(() => validateBondSuccess({ userPatientId, status })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo actualizar la relación familiar. Revisá la conexión e intentá de nuevo.');
            return of(validateBondFailure({ error }));
          }),
        ),
      ),
    ),
  );

  registerGuardian$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerGuardian),
      concatMap((body) =>
        this.familyLink.registerGuardian(body).pipe(
          tap(() => this.notification.success('Responsable vinculado. Se envió el mail de primer acceso si la cuenta es nueva.')),
          map(() => registerGuardianSuccess({ patientId: body.patientId })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error(error?.error?.message ?? 'No se pudo dar de alta al responsable. Intentá de nuevo.');
            return of(registerGuardianFailure({ error }));
          }),
        ),
      ),
    ),
  );

  refreshGuardiansAfterRegister$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerGuardianSuccess),
      map(({ patientId }) => loadPatientGuardians({ patientId })),
    ),
  );

  /**
   * Mensaje de error al intentar volver de fase, mapeado desde el body del backend.
   *
   * A diferencia de `verifyErrorMessage` (bespoke, mapea sólo por código HTTP), acá el
   * texto que arma `InvalidAttentionStateException` (p. ej. "cobro ya registrado") ya es
   * español y user-friendly y queremos mostrarlo tal cual — así que reusamos el sanitizador
   * compartido `humanizeBackendError` (regla #4) en vez de duplicar la lógica anti-leak: deja
   * pasar el mensaje del backend sólo si no matchea ningún patrón de leak (FQCN, stack trace,
   * `NullPointerException`, etc.), y si no, cae al genérico.
   */
  private returnPhaseErrorMessage(error: HttpErrorResponse): string {
    return humanizeBackendError(error, {
      fallback: 'No se pudo volver al paso anterior.',
    });
  }

  /** Mensaje de error de verificación de paciente, mapeado por código HTTP. Sin leak de internals. */
  private verifyErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 422:
        // El backend (PatientNotVerifiableException) rechaza la verificación cuando
        // faltan datos obligatorios o una cobertura activa.
        return 'No se pudo verificar el paciente: faltan datos obligatorios o una cobertura activa.';
      case 404:
        return 'No se encontró el paciente a verificar. Actualizá la atención e intentá de nuevo.';
      default:
        return 'No se pudo verificar el paciente. Revisá la conexión y volvé a intentarlo.';
    }
  }

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
            // T3: la respuesta del PATCH addAnalysis vuelve con `analysisAuthorizations`
            // STALE/vacío (la DB sí quedó con las correctas — el pricing lo refleja). Si
            // confiáramos en `item`, el resumen mostraría 0 análisis tras quitar uno.
            // Recargamos el detalle por GET (trae las autorizaciones reales) y dejamos que
            // el `analysesLoader` del resumen reactive recargue el catálogo (nombre/NBU).
            loadAtencion({ id: attentionId }),
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

  /** Marcar/desmarcar urgente desde recepción (KAN-140, gateado por módulo URGENCIAS en el BE). */
  setUrgentFlag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setUrgentFlag),
      concatMap(({ id, isUrgent }) =>
        this.api.setUrgentFlag(id, isUrgent).pipe(
          map(item => setUrgentFlagSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo actualizar la marca de urgente. Revisá la conexión y volvé a intentarlo.');
            return of(setUrgentFlagFailure({ error }));
          }),
        )
      )
    )
  );

  /** Modo express urgente (KAN-140): salta cobro/facturación/confirmación y manda a extracción. */
  advanceUrgent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(advanceUrgent),
      concatMap(({ id }) =>
        this.api.advanceUrgent(id).pipe(
          map(item => advanceUrgentSuccess({ item })),
          catchError((error: HttpErrorResponse) => {
            this.notification.error('No se pudo avanzar la atención urgente. Revisá la conexión y volvé a intentarlo.');
            return of(advanceUrgentFailure({ error }));
          }),
        )
      )
    )
  );

  /**
   * Al avanzar urgente con éxito, vuelve a Recepción con un toast de confirmación.
   *
   * KAN-188/GAP-E: navegaba a `/analitica/extraccion`, ruta gateada a EXTRACTOR/ADMINISTRADOR
   * (`hasRoleGuard`) — pero quien dispara `advanceUrgent` es SECRETARIA/RESPONSABLE_SECRETARIA
   * (mismos roles que el back autoriza en `/urgent/advance`). El guard bloqueaba el match y
   * Angular redirigía a `/` sin ningún feedback: la atención SÍ había avanzado en el back, pero
   * la secretaria terminaba en el home sin saber si la acción funcionó — no podía "salir" del
   * flujo con una confirmación clara. Recepción es accesible para esos mismos roles
   * (`recepcionAccessGuard`) y es el destino que ya usan el resto de los cierres del wizard
   * (onFinished/backToList/cancel).
   */
  advanceUrgentNavigate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(advanceUrgentSuccess),
      tap(() => {
        this.notification.success('Atención urgente enviada a la cola de extracción.');
        this.router.navigate(['/turnos/recepcion']);
      }),
    ),
    { dispatch: false }
  );
}
