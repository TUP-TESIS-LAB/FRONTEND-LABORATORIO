import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { FinancieroApiService } from '../services/financiero-api.service';
import { NotificationService } from '@core/services/notification.service';
import { triggerDownload } from '@shared/utils/blob-download';
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
  loadMovements, loadMovementsSuccess, loadMovementsNotModified, loadMovementsFailure,
  registerBranchMovement, registerBranchMovementSuccess, registerBranchMovementFailure,
  loadBankAccounts, loadBankAccountsSuccess, loadBankAccountsFailure,
  createBankAccount, createBankAccountSuccess, createBankAccountFailure,
  updateBankAccount, updateBankAccountSuccess, updateBankAccountFailure,
  deactivateBankAccount, deactivateBankAccountSuccess, deactivateBankAccountFailure,
  loadPayments, loadPaymentsSuccess, loadPaymentsFailure,
  loadPayment, pollPayment, loadPaymentSuccess, loadPaymentNotModified, loadPaymentFailure,
  cancelPayment, cancelPaymentSuccess, cancelPaymentFailure,
  downloadComprobante, downloadComprobanteSuccess, downloadComprobanteFailure,
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

/**
 * Fallback genérico por status cuando el body de error no se pudo leer o
 * parsear. El 409 ya no tiene un único significado fijo (identidad fiscal
 * incompleta / comprobante pendiente de emisión / factura ya emitida) — sin
 * body legible no podemos distinguir cuál de los tres es, así que cae a un
 * mensaje neutro en vez de asumir "configuración incompleta".
 */
function mapComprobanteErrorFallback(status: number): string {
  if (status === 404) return 'No existe un comprobante emitido para este pago.';
  return 'No se pudo descargar el comprobante. Probá de nuevo.';
}

/**
 * El backend devuelve el body de error como JSON, pero como pedimos
 * `responseType: 'blob'` para el PDF, ese body llega como Blob, no parseado.
 * Hay que leerlo explícitamente para recuperar el `message` — que ya viene en
 * español y saneado (GlobalExceptionHandler) — y así distinguir los tres
 * significados que hoy conviven bajo 409. Si el body no está o no parsea,
 * cae al fallback genérico por status.
 */
async function resolveComprobanteErrorMessage(e: HttpErrorResponse): Promise<string> {
  if (e.error instanceof Blob) {
    try {
      const text = await e.error.text();
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
        return parsed.message;
      }
    } catch {
      // body no parseable como JSON → cae al fallback genérico.
    }
  }
  return mapComprobanteErrorFallback(e.status);
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

  // ── feed de movimientos multi-sucursal (KAN-161, polleable ETag/304) ───────
  loadMovements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMovements),
      switchMap(({ from, to, branchId }) =>
        this.api.getMovements(from, to, branchId).pipe(
          map(res => isNotModified(res)
            ? loadMovementsNotModified()
            : loadMovementsSuccess({ data: res })),
          catchError((e: HttpErrorResponse) =>
            of(loadMovementsFailure({ error: mapBranchMovementError(e) }))),
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

  // ── cobros: detalle de pago — carga inicial, SIEMPRE fresca (sin ETag) ──────
  // KAN-245: si esta carga fuera condicional, un 304 devuelto para el id recién
  // pedido podía dejar `selected` mostrando el pago de una visita anterior.
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

  // ── cobros: detalle de pago — tick de polling mientras está PENDING ────────
  pollPayment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(pollPayment),
      switchMap(({ id }) =>
        this.api.pollPayment(id).pipe(
          map(res => isNotModified(res)
            ? loadPaymentNotModified({ id })
            : loadPaymentSuccess({ payment: res })),
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

  // ── cobros: descargar comprobante PDF ──────────────────────────────────────
  downloadComprobante$ = createEffect(() =>
    this.actions$.pipe(
      ofType(downloadComprobante),
      concatMap(({ paymentId }) =>
        this.api.getComprobantePdf(paymentId).pipe(
          map(res => {
            triggerDownload(res, `comprobante-${paymentId}.pdf`);
            return downloadComprobanteSuccess();
          }),
          // Leer el body del error es asíncrono (es un Blob), así que el mensaje se resuelve
          // dentro del stream con from(...). El Failure se despacha una sola vez.
          catchError((e: HttpErrorResponse) =>
            from(resolveComprobanteErrorMessage(e)).pipe(
              map(error => {
                this.notif.error(error);
                return downloadComprobanteFailure({ error });
              }),
            ),
          ),
        ),
      ),
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
