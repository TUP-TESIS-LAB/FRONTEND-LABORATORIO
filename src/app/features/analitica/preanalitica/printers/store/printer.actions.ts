import { createAction, props } from '@ngrx/store';
import { Printer, PrinterCreateInput, RegisteredPrinter } from '../models/printer.model';

export const loadPrinters = createAction('[Printers] Load');
export const loadPrintersSuccess = createAction('[Printers] Load Success', props<{ items: Printer[] }>());
export const loadPrintersFailure = createAction('[Printers] Load Failure');

export const addPrinter = createAction('[Printers] Add', props<{ input: PrinterCreateInput }>());
export const addPrinterSuccess = createAction('[Printers] Add Success', props<{ printer: RegisteredPrinter }>());
export const addPrinterFailure = createAction('[Printers] Add Failure');

export const deletePrinter = createAction('[Printers] Delete', props<{ id: number }>());
export const deletePrinterSuccess = createAction('[Printers] Delete Success', props<{ id: number }>());
export const deletePrinterFailure = createAction('[Printers] Delete Failure');

export const clearLastToken = createAction('[Printers] Clear Last Token');
