import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { toApiError } from '../../../../shared/utils/api-error-mapper';
import { TotemService } from '../../pages/totem/services/totem.service';
import * as A from './totem.actions';

const GENERIC_TOTEM_ERROR = 'Hubo un error. Probá de nuevo en un momento.';

/**
 * Mensaje a mostrar en el tótem. El backend ya devuelve errores de negocio en español y
 * saneados (p. ej. "El tótem no está habilitado en esta sucursal"), así que los propagamos
 * tal cual. Para 5xx o fallas de red no hay mensaje de dominio confiable → genérico.
 */
function totemErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status < 500) {
    const message = toApiError(err).message?.trim();
    if (message) return message;
  }
  return GENERIC_TOTEM_ERROR;
}

@Injectable()
export class TotemEffects {
  private actions$ = inject(Actions);
  private totemService = inject(TotemService);

  submitTotemEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.submitTotemEntry),
      switchMap(({ dni, slug, branchId }) =>
        this.totemService.checkIn(slug, branchId, dni).pipe(
          map(res =>
            A.submitTotemEntrySuccess({ queueNumber: res.queueNumber, hasAppointment: res.hasAppointment }),
          ),
          catchError((err) => of(A.submitTotemEntryFailure({ message: totemErrorMessage(err) }))),
        ),
      ),
    ),
  );
}
