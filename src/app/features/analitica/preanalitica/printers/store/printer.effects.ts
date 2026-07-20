import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { catchError, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { PrinterService } from '../services/printer.service';
import * as A from './printer.actions';

@Injectable()
export class PrinterEffects {
  private actions$ = inject(Actions);
  private service = inject(PrinterService);
  private messages = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadPrinters),
    switchMap(() => this.service.list().pipe(
      map(items => A.loadPrintersSuccess({ items })),
      catchError(() => of(A.loadPrintersFailure())),
    )),
  ));

  add$ = createEffect(() => this.actions$.pipe(
    ofType(A.addPrinter),
    mergeMap(({ input }) => this.service.create(input).pipe(
      map(printer => A.addPrinterSuccess({ printer })),
      catchError(() => of(A.addPrinterFailure())),
    )),
  ));

  addSuccessToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.addPrinterSuccess),
    tap(() => this.messages.add({ severity: 'success', summary: 'Impresora registrada', detail: 'Copiá el token ahora: no se vuelve a mostrar.' })),
  ), { dispatch: false });

  delete$ = createEffect(() => this.actions$.pipe(
    ofType(A.deletePrinter),
    mergeMap(({ id }) => this.service.delete(id).pipe(
      map(() => A.deletePrinterSuccess({ id })),
      catchError(() => of(A.deletePrinterFailure())),
    )),
  ));

  deleteSuccessToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.deletePrinterSuccess),
    tap(() => this.messages.add({ severity: 'success', summary: 'Impresora eliminada', detail: 'La impresora fue dada de baja.' })),
  ), { dispatch: false });

  showError$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadPrintersFailure, A.addPrinterFailure, A.deletePrinterFailure),
    tap(() => this.messages.add({ severity: 'error', summary: 'Error', detail: 'La operación sobre impresoras falló.' })),
  ), { dispatch: false });
}
