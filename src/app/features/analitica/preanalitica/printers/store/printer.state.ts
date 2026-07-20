import { Printer } from '../models/printer.model';

export const PRINTER_FEATURE_KEY = 'printers';

export interface PrinterState {
  items: Printer[];
  loading: boolean;
  lastRegisteredToken: string | null;
}

export const initialPrinterState: PrinterState = {
  items: [],
  loading: false,
  lastRegisteredToken: null,
};
