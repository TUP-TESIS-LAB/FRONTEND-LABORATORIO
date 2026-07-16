import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { WorksheetTemplatesApiService } from '../../services/worksheet-templates-api.service';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
  deleteTemplate, deleteTemplateSuccess, deleteTemplateFailure,
} from './worksheet-templates.actions';

@Injectable()
export class WorksheetTemplatesEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(WorksheetTemplatesApiService);

  loadTemplates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTemplates),
      switchMap(() =>
        this.api.listTemplates().pipe(
          map(templates => loadTemplatesSuccess({ templates })),
          catchError((error: HttpErrorResponse) => of(loadTemplatesFailure({ error }))),
        ),
      ),
    ),
  );

  saveTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTemplate),
      concatMap(({ id, name, analyses }) => {
        const body = { name, analyses };
        const call$ = id == null ? this.api.createTemplate(body) : this.api.updateTemplate(id, body);
        return call$.pipe(
          map(() => saveTemplateSuccess()),
          catchError((error: HttpErrorResponse) => of(saveTemplateFailure({ error }))),
        );
      }),
    ),
  );

  deleteTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteTemplate),
      concatMap(({ id }) =>
        this.api.deleteTemplate(id).pipe(
          map(() => deleteTemplateSuccess()),
          catchError((error: HttpErrorResponse) => of(deleteTemplateFailure({ error }))),
        ),
      ),
    ),
  );

  reloadAfterSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTemplateSuccess, deleteTemplateSuccess),
      map(() => loadTemplates()),
    ),
  );
}
