import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap, tap, forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';

import * as A from './sucursal.actions';
import { SucursalService } from '../services/sucursal.service';
import { BranchScheduleService } from '../services/branch-schedule.service';
import { BranchContactService } from '../services/branch-contact.service';
import { BranchWorkspaceService } from '../services/branch-workspace.service';
import { BranchTotemConfigService } from '../services/branch-totem-config.service';
import { AreaService } from '../services/area.service';
import { SectionService } from '../services/section.service';

@Injectable()
export class SucursalEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(SucursalService);
  private readonly scheduleService = inject(BranchScheduleService);
  private readonly contactService = inject(BranchContactService);
  private readonly workspaceService = inject(BranchWorkspaceService);
  private readonly totemConfigService = inject(BranchTotemConfigService);
  private readonly areaService = inject(AreaService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);

  private errorMessage(err: unknown): unknown {
    return err instanceof Error ? err.message : err;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // List (existing)
  // ──────────────────────────────────────────────────────────────────────────
  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadSucursales),
    switchMap(() => this.service.list().pipe(
      map(page => A.loadSucursalesSuccess({ list: page.content })),
      catchError(error => of(A.loadSucursalesFailure({ error })))
    ))
  ));

  add$ = createEffect(() => this.actions$.pipe(
    ofType(A.addSucursal),
    switchMap(({ input }) => this.service.create(input).pipe(
      map(sucursal => A.addSucursalSuccess({ sucursal })),
      catchError(error => of(A.addSucursalFailure({ error })))
    ))
  ));

  update$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateSucursal),
    switchMap(({ id, input }) => this.service.update(id, input).pipe(
      map(sucursal => A.updateSucursalSuccess({ sucursal })),
      catchError(error => of(A.updateSucursalFailure({ error })))
    ))
  ));

  toggle$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleSucursalStatus),
    switchMap(({ id }) => this.service.toggleStatus(id).pipe(
      map(sucursal => A.toggleSucursalStatusSuccess({ sucursal })),
      catchError(error => of(A.toggleSucursalStatusFailure({ error })))
    ))
  ));

  delete$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteSucursal),
    switchMap(({ id }) => this.service.delete(id).pipe(
      map(() => A.deleteSucursalSuccess({ id })),
      catchError(error => of(A.deleteSucursalFailure({ error })))
    ))
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Detail — parallel forkJoin load
  // ──────────────────────────────────────────────────────────────────────────
  loadDetail$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadDetail),
    switchMap(({ branchId }) => forkJoin({
      branch: this.service.getById(branchId),
      schedules: this.scheduleService.list(branchId),
      contacts: this.contactService.list(branchId),
      workspaces: this.workspaceService.list(branchId),
      totemConfig: this.totemConfigService.get(branchId),
    }).pipe(
      map(result => A.loadDetailSuccess(result)),
      catchError(err => of(A.loadDetailFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Schedules
  // ──────────────────────────────────────────────────────────────────────────
  loadSchedules$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadSchedules),
    switchMap(({ branchId }) => this.scheduleService.list(branchId).pipe(
      map(schedules => A.loadSchedulesSuccess({ schedules })),
      catchError(err => of(A.loadSchedulesFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // mergeMap (no switchMap): el componente puede dispatchar N add/update/delete
  // independientes en paralelo (p.ej. HorariosStep.add() hace un loop por dia
  // seleccionado). switchMap cancelaria todos menos el ultimo silenciosamente.
  addSchedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.addSchedule),
    mergeMap(({ branchId, input }) => this.scheduleService.create(branchId, input).pipe(
      map(schedule => A.addScheduleSuccess({ schedule })),
      catchError(err => of(A.addScheduleFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  updateSchedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateSchedule),
    mergeMap(({ branchId, id, input }) => this.scheduleService.update(branchId, id, input).pipe(
      map(schedule => A.updateScheduleSuccess({ schedule })),
      catchError(err => of(A.updateScheduleFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  deleteSchedule$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteSchedule),
    mergeMap(({ branchId, id }) => this.scheduleService.delete(branchId, id).pipe(
      map(() => A.deleteScheduleSuccess({ id })),
      catchError(err => of(A.deleteScheduleFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Contacts
  // ──────────────────────────────────────────────────────────────────────────
  loadContacts$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadContacts),
    switchMap(({ branchId }) => this.contactService.list(branchId).pipe(
      map(contacts => A.loadContactsSuccess({ contacts })),
      catchError(err => of(A.loadContactsFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // mergeMap: misma razon que schedules. Multiples contactos pueden agregarse/
  // editarse/borrarse en paralelo desde la UI sin que el efecto cancele en vuelo.
  addContact$ = createEffect(() => this.actions$.pipe(
    ofType(A.addContact),
    mergeMap(({ branchId, input }) => this.contactService.create(branchId, input).pipe(
      map(contact => A.addContactSuccess({ contact })),
      catchError(err => of(A.addContactFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  updateContact$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateContact),
    mergeMap(({ branchId, id, input }) => this.contactService.update(branchId, id, input).pipe(
      map(contact => A.updateContactSuccess({ contact })),
      catchError(err => of(A.updateContactFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  deleteContact$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteContact),
    mergeMap(({ branchId, id }) => this.contactService.delete(branchId, id).pipe(
      map(() => A.deleteContactSuccess({ id })),
      catchError(err => of(A.deleteContactFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Workspaces
  // ──────────────────────────────────────────────────────────────────────────
  loadWorkspaces$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadWorkspaces),
    switchMap(({ branchId }) => this.workspaceService.list(branchId).pipe(
      map(workspaces => A.loadWorkspacesSuccess({ workspaces })),
      catchError(err => of(A.loadWorkspacesFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  syncWorkspaces$ = createEffect(() => this.actions$.pipe(
    ofType(A.syncWorkspaces),
    switchMap(({ branchId, workspaces }) => this.workspaceService.sync(branchId, workspaces).pipe(
      map(updated => A.syncWorkspacesSuccess({ workspaces: updated })),
      catchError(err => of(A.syncWorkspacesFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Totem config
  // ──────────────────────────────────────────────────────────────────────────
  loadTotemConfig$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTotemConfig),
    switchMap(({ branchId }) => this.totemConfigService.get(branchId).pipe(
      map(totemConfig => A.loadTotemConfigSuccess({ totemConfig })),
      catchError(err => of(A.loadTotemConfigFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  upsertTotemConfig$ = createEffect(() => this.actions$.pipe(
    ofType(A.upsertTotemConfig),
    switchMap(({ branchId, enabled, atencionDisplayEnabled, extraccionDisplayEnabled }) =>
      this.totemConfigService.upsert(branchId, { enabled, atencionDisplayEnabled, extraccionDisplayEnabled }).pipe(
        map(totemConfig => A.upsertTotemConfigSuccess({ totemConfig })),
        catchError(err => of(A.upsertTotemConfigFailure({ error: this.errorMessage(err) }))),
      )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Areas
  // ──────────────────────────────────────────────────────────────────────────
  loadAreas$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadAreas),
    switchMap(() => this.areaService.list({ page: 0, size: 100 }).pipe(
      map(page => A.loadAreasSuccess({ areas: page.content })),
      catchError(err => of(A.loadAreasFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // mergeMap preventivo: mismo riesgo que schedules/contacts si el ABM de
  // areas dispara varias acciones en rafaga (toggle masivo, alta multiple).
  addArea$ = createEffect(() => this.actions$.pipe(
    ofType(A.addArea),
    mergeMap(({ input }) => this.areaService.create(input).pipe(
      map(area => A.addAreaSuccess({ area })),
      catchError(err => of(A.addAreaFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  updateArea$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateArea),
    mergeMap(({ id, input }) => this.areaService.update(id, input).pipe(
      map(area => A.updateAreaSuccess({ area })),
      catchError(err => of(A.updateAreaFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  toggleAreaStatus$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleAreaStatus),
    mergeMap(({ id }) => this.areaService.toggleStatus(id).pipe(
      map(area => A.toggleAreaStatusSuccess({ area })),
      catchError(err => of(A.toggleAreaStatusFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  deleteArea$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteArea),
    mergeMap(({ id }) => this.areaService.delete(id).pipe(
      map(() => A.deleteAreaSuccess({ id })),
      catchError(err => of(A.deleteAreaFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Sections
  // ──────────────────────────────────────────────────────────────────────────
  loadSections$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadSections),
    switchMap(() => this.sectionService.list({ page: 0, size: 100 }).pipe(
      map(page => A.loadSectionsSuccess({ sections: page.content })),
      catchError(err => of(A.loadSectionsFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // mergeMap preventivo: idem areas.
  addSection$ = createEffect(() => this.actions$.pipe(
    ofType(A.addSection),
    mergeMap(({ input }) => this.sectionService.create(input).pipe(
      map(section => A.addSectionSuccess({ section })),
      catchError(err => of(A.addSectionFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  updateSection$ = createEffect(() => this.actions$.pipe(
    ofType(A.updateSection),
    mergeMap(({ id, input }) => this.sectionService.update(id, input).pipe(
      map(section => A.updateSectionSuccess({ section })),
      catchError(err => of(A.updateSectionFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  toggleSectionStatus$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleSectionStatus),
    mergeMap(({ id }) => this.sectionService.toggleStatus(id).pipe(
      map(section => A.toggleSectionStatusSuccess({ section })),
      catchError(err => of(A.toggleSectionStatusFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  deleteSection$ = createEffect(() => this.actions$.pipe(
    ofType(A.deleteSection),
    mergeMap(({ id }) => this.sectionService.delete(id).pipe(
      map(() => A.deleteSectionSuccess({ id })),
      catchError(err => of(A.deleteSectionFailure({ error: this.errorMessage(err) }))),
    )),
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // Error toast
  // ──────────────────────────────────────────────────────────────────────────
  showError$ = createEffect(() => this.actions$.pipe(
    ofType(
      A.loadSucursalesFailure,
      A.addSucursalFailure,
      A.updateSucursalFailure,
      A.toggleSucursalStatusFailure,
      A.deleteSucursalFailure,
      A.loadDetailFailure,
      A.loadSchedulesFailure,
      A.addScheduleFailure,
      A.updateScheduleFailure,
      A.deleteScheduleFailure,
      A.loadContactsFailure,
      A.addContactFailure,
      A.updateContactFailure,
      A.deleteContactFailure,
      A.loadWorkspacesFailure,
      A.syncWorkspacesFailure,
      A.loadTotemConfigFailure,
      A.upsertTotemConfigFailure,
      A.loadAreasFailure,
      A.addAreaFailure,
      A.updateAreaFailure,
      A.toggleAreaStatusFailure,
      A.deleteAreaFailure,
      A.loadSectionsFailure,
      A.addSectionFailure,
      A.updateSectionFailure,
      A.toggleSectionStatusFailure,
      A.deleteSectionFailure,
    ),
    tap(() => this.messageService.add({
      severity: 'error', summary: 'Error', detail: 'Operación de sucursales falló.',
    }))
  ), { dispatch: false });
}
