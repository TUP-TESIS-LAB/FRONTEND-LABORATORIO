import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { FinancieroApiService } from '../services/financiero-api.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadCashRegisters, loadCashRegistersSuccess, loadCashRegistersFailure,
  createCashRegister, createCashRegisterSuccess, createCashRegisterFailure,
  deactivateCashRegister, deactivateCashRegisterSuccess, deactivateCashRegisterFailure,
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivity, loadActivitySuccess, loadActivityNotModified, loadActivityFailure,
  openSession, openSessionSuccess, openSessionFailure,
  closeSession, closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
  loadBranchOtherMedia, loadBranchOtherMediaSuccess, loadBranchOtherMediaNotModified, loadBranchOtherMediaFailure,
  loadBranchesSummary, loadBranchesSummarySuccess, loadBranchesSummaryNotModified, loadBranchesSummaryFailure,
  registerBranchMovement, registerBranchMovementSuccess, registerBranchMovementFailure,
  loadBankAccounts, loadBankAccountsSuccess, loadBankAccountsFailure,
  createBankAccount, createBankAccountSuccess, createBankAccountFailure,
  updateBankAccount, updateBankAccountSuccess, updateBankAccountFailure,
  deactivateBankAccount, deactivateBankAccountSuccess, deactivateBankAccountFailure,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, loadPaymentSuccess, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  registerPayment, registerPaymentSuccess, registerPaymentFailure,
  loadFiscalConfig, loadFiscalConfigSuccess, loadFiscalConfigFailure,
  saveFiscalConfig, saveFiscalConfigSuccess, saveFiscalConfigFailure,
} from './financiero.actions';

function mapCajaError(e: HttpErrorResponse): string {
  if (e.status === 409) return 'Ya hay una caja abierta para esta subcaja.';
  if (e.status === 422) return 'No se puede operar: no hay una caja abierta.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

function mapCashRegisterError(e: HttpErrorResponse): string {
  if (e.status === 409) return 'Ya existe una caja con ese nombre en la sucursal.';
  if (e.status === 422) return 'No se puede dar de baja: la caja tiene una sesión abierta.';
  if (e.status === 404) return 'La caja indicada no existe.';
  if (e.status === 403) return 'No tenés permisos para administrar las cajas.';
  return 'Ocurrió un error al administrar las cajas. Intentá de nuevo.';
}

function mapBankAccountError(e: HttpErrorResponse): string {
  if (e.status === 409) return 'Ya existe una cuenta con ese nombre.';
  if (e.status === 404) return 'La cuenta indicada no existe.';
  if (e.status === 422) return 'Los datos de la cuenta son inválidos.';
  if (e.status === 403) return 'No tenés permisos para administrar las cuentas destino.';
  return 'Ocurrió un error al administrar las cuentas destino. Intentá de nuevo.';
}

function mapBranchMovementError(e: HttpErrorResponse): string {
  if (e.status === 422) return 'Faltan datos del medio de pago o la cuenta destino no es válida.';
  return 'Ocurrió un error al registrar el movimiento. Intentá de nuevo.';
}

function mapCobrosError(e: HttpErrorResponse): string {
  if (e.status === 404) return 'El pago solicitado no existe.';
  if (e.status === 409) return 'El pago ya fue cancelado o no se puede cancelar en su estado actual.';
  if (e.status === 422) return 'La suma de los medios de pago no coincide con el total.';
  return 'Ocurrió un error al procesar la operación. Intentá de nuevo.';
}

function mapRegisterPaymentError(e: HttpErrorResponse): string {
  const apiMsg = typeof e.error?.message === 'string' ? e.error.message : '';
  if (e.status === 409) {
    if (/caja/i.test(apiMsg)) return 'No se puede cobrar: no hay una caja abierta.';
    if (/monto|suma|importe/i.test(apiMsg)) return 'La suma de los medios de pago no coincide con el total.';
    return 'No se pudo registrar el cobro. Revisá la caja y los montos e intentá de nuevo.';
  }
  if (e.status === 422) return 'Los datos del cobro son inválidos.';
  return 'Ocurrió un error al registrar el cobro. Intentá de nuevo.';
}

@Injectable()
export class FinancieroEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(FinancieroApiService);
  private readonly notif = inject(NotificationService);

  // ── listar subcajas de la sucursal ─────────────────────────────────────────
  loadCashRegisters$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCashRegisters),
      switchMap(({ branchId }) =>
        this.api.listCashRegisters(branchId).pipe(
          map(registers => loadCashRegistersSuccess({ registers })),
          catchError((e: HttpErrorResponse) =>
            of(loadCashRegistersFailure({ error: mapCashRegisterError(e) }))),
        ),
      ),
    ),
  );

  // ── crear subcaja (admin) ──────────────────────────────────────────────────
  createCashRegister$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createCashRegister),
      concatMap(({ branchId, name }) =>
        this.api.createCashRegister(branchId, name).pipe(
          map(register => {
            this.notif.success('Caja creada correctamente.');
            return createCashRegisterSuccess({ register });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCashRegisterError(e);
            this.notif.error(error);
            return of(createCashRegisterFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── baja de subcaja (admin) ────────────────────────────────────────────────
  deactivateCashRegister$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deactivateCashRegister),
      concatMap(({ id, branchId }) =>
        this.api.deactivateCashRegister(id).pipe(
          map(() => {
            this.notif.success('Caja dada de baja.');
            return deactivateCashRegisterSuccess({ branchId });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCashRegisterError(e);
            this.notif.error(error);
            return of(deactivateCashRegisterFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── recargar listado tras baja (create ya agrega al state) ─────────────────
  reloadCashRegistersAfterDeactivate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deactivateCashRegisterSuccess),
      map(({ branchId }) => loadCashRegisters({ branchId })),
    ),
  );

  // ── cargar sesión abierta de la subcaja ────────────────────────────────────
  loadOpenSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadOpenSession),
      switchMap(({ cashRegisterId }) =>
        this.api.getOpenSession(cashRegisterId).pipe(
          map(session => session === null ? sessionNotFound() : loadOpenSessionSuccess({ session })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            return of(loadOpenSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── actividad de sesión (polleada) ─────────────────────────────────────────
  loadActivity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadActivity),
      switchMap(({ sessionId }) =>
        this.api.getActivity(sessionId).pipe(
          map(res => isNotModified(res)
            ? loadActivityNotModified()
            : loadActivitySuccess({ activity: res })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            return of(loadActivityFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // Apenas se resuelve la sesión (selección de subcaja o apertura), traer su
  // actividad SIN esperar el tick de polling de 5s. Evita el estado incoherente
  // "saldo con 0 movimientos" en la carga y el conteo de cobros stale al cambiar
  // de subcaja (el poll leía this.session(), que llega tarde).
  loadActivityOnSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadOpenSessionSuccess, openSessionSuccess),
      filter(({ session }) => session?.status === 'OPEN'),
      map(({ session }) => loadActivity({ sessionId: session.id })),
    ),
  );

  // ── abrir sesión ───────────────────────────────────────────────────────────
  openSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(openSession),
      concatMap(({ cashRegisterId, openingAmount }) =>
        this.api.openSession(cashRegisterId, openingAmount).pipe(
          map(session => {
            this.notif.success('Caja abierta correctamente.');
            return openSessionSuccess({ session });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(openSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cerrar sesión ──────────────────────────────────────────────────────────
  closeSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(closeSession),
      concatMap(({ id, declaredAmount }) =>
        this.api.closeSession(id, declaredAmount).pipe(
          map(session => {
            this.notif.success('Caja cerrada. Arqueo registrado.');
            return closeSessionSuccess({ session });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(closeSessionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── registrar movimiento ───────────────────────────────────────────────────
  registerTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerTransaction),
      concatMap(({ id, body }) =>
        this.api.registerTransaction(id, body).pipe(
          map(() => {
            this.notif.success('Movimiento registrado.');
            return registerTransactionSuccess();
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCajaError(e);
            this.notif.error(error);
            return of(registerTransactionFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── otros medios: vista sucursal+día (polleada, ETag/304) ──────────────────
  loadBranchOtherMedia$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBranchOtherMedia),
      switchMap(({ branchId, from, to }) =>
        this.api.getBranchOtherMedia(branchId, from, to).pipe(
          map(res => isNotModified(res)
            ? loadBranchOtherMediaNotModified()
            : loadBranchOtherMediaSuccess({ data: res })),
          catchError((e: HttpErrorResponse) =>
            of(loadBranchOtherMediaFailure({ error: mapBranchMovementError(e) }))),
        ),
      ),
    ),
  );

  // ── resumen multi-sucursal (KAN-161, polleable ETag/304) ───────────────────
  loadBranchesSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBranchesSummary),
      switchMap(({ from, to }) =>
        this.api.getBranchesSummary(from, to).pipe(
          map(res => isNotModified(res)
            ? loadBranchesSummaryNotModified()
            : loadBranchesSummarySuccess({ data: res })),
          catchError((e: HttpErrorResponse) =>
            of(loadBranchesSummaryFailure({ error: mapBranchMovementError(e) }))),
        ),
      ),
    ),
  );

  // ── otros medios: registrar movimiento manual no-efectivo ──────────────────
  registerBranchMovement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerBranchMovement),
      concatMap(({ body }) =>
        this.api.registerBranchMovement(body).pipe(
          map(() => {
            this.notif.success('Movimiento registrado.');
            return registerBranchMovementSuccess();
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapBranchMovementError(e);
            this.notif.error(error);
            return of(registerBranchMovementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cuentas destino: listar ────────────────────────────────────────────────
  loadBankAccounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBankAccounts),
      switchMap(() =>
        this.api.listBankAccounts().pipe(
          map(accounts => loadBankAccountsSuccess({ accounts })),
          catchError((e: HttpErrorResponse) =>
            of(loadBankAccountsFailure({ error: mapBankAccountError(e) }))),
        ),
      ),
    ),
  );

  // ── cuentas destino: crear ─────────────────────────────────────────────────
  createBankAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createBankAccount),
      concatMap(({ body }) =>
        this.api.createBankAccount(body).pipe(
          map(account => {
            this.notif.success('Cuenta creada correctamente.');
            return createBankAccountSuccess({ account });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapBankAccountError(e);
            this.notif.error(error);
            return of(createBankAccountFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cuentas destino: editar ────────────────────────────────────────────────
  updateBankAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBankAccount),
      concatMap(({ id, body }) =>
        this.api.updateBankAccount(id, body).pipe(
          map(account => {
            this.notif.success('Cuenta actualizada.');
            return updateBankAccountSuccess({ account });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapBankAccountError(e);
            this.notif.error(error);
            return of(updateBankAccountFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cuentas destino: baja lógica ───────────────────────────────────────────
  deactivateBankAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deactivateBankAccount),
      concatMap(({ id }) =>
        this.api.deactivateBankAccount(id).pipe(
          map(() => {
            this.notif.success('Cuenta dada de baja.');
            return deactivateBankAccountSuccess();
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapBankAccountError(e);
            this.notif.error(error);
            return of(deactivateBankAccountFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cuentas destino: recargar listado tras baja ────────────────────────────
  reloadBankAccountsAfterDeactivate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deactivateBankAccountSuccess),
      map(() => loadBankAccounts()),
    ),
  );

  // ── cobros: listar pagos ───────────────────────────────────────────────────
  loadPayments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPayments),
      switchMap(({ branchId, status }) =>
        this.api.listPayments({ branchId, status }).pipe(
          map(items => loadPaymentsSuccess({ items })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCobrosError(e);
            return of(loadPaymentsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cobros: detalle de pago ────────────────────────────────────────────────
  loadPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPayment),
      switchMap(({ id }) =>
        this.api.getPayment(id).pipe(
          map(payment => loadPaymentSuccess({ payment })),
          catchError((e: HttpErrorResponse) => {
            const error = mapCobrosError(e);
            return of(loadPaymentFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cobros: cancelar pago ──────────────────────────────────────────────────
  cancelPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelPayment),
      concatMap(({ id, reason }) =>
        this.api.cancelPayment(id, reason).pipe(
          map(payment => {
            this.notif.success('Pago cancelado · reversa en caja');
            return cancelPaymentSuccess({ payment });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapCobrosError(e);
            this.notif.error(error);
            return of(cancelPaymentFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── cobros: recargar detalle tras cancelar ─────────────────────────────────
  reloadPaymentAfterCancel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelPaymentSuccess),
      map(({ payment }) => loadPayment({ id: payment.id })),
    ),
  );

  // ── cobro: registrar pago de atención ─────────────────────────────────────
  registerPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(registerPayment),
      concatMap(({ body }) =>
        this.api.createPayment(body).pipe(
          map(result => {
            this.notif.success('Cobro registrado correctamente.');
            return registerPaymentSuccess({ result });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapRegisterPaymentError(e);
            this.notif.error(error);
            return of(registerPaymentFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── config fiscal: cargar ──────────────────────────────────────────────────
  loadFiscalConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadFiscalConfig),
      switchMap(({ tenantId }) =>
        this.api.getFiscalConfig(tenantId).pipe(
          map(config => loadFiscalConfigSuccess({ config })),
          catchError((e: HttpErrorResponse) => {
            const error = e.status === 404
              ? 'No se encontró la configuración fiscal para este tenant.'
              : 'Ocurrió un error al cargar la configuración fiscal.';
            return of(loadFiscalConfigFailure({ error }));
          }),
        ),
      ),
    ),
  );

  // ── config fiscal: guardar ─────────────────────────────────────────────────
  saveFiscalConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveFiscalConfig),
      concatMap(({ body }) =>
        this.api.saveFiscalConfig(body).pipe(
          map(config => {
            this.notif.success('Configuración fiscal guardada');
            return saveFiscalConfigSuccess({ config });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = e.status === 422
              ? 'Los datos de configuración fiscal son inválidos.'
              : 'Ocurrió un error al guardar la configuración fiscal.';
            this.notif.error(error);
            return of(saveFiscalConfigFailure({ error }));
          }),
        ),
      ),
    ),
  );

}
