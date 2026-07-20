export interface Printer {
  id: number;
  name: string;
  branchId: number;
  ipAddress: string;
  port: number;
}

export interface PrinterCreateInput {
  name: string;
  branchId: number;
  ipAddress: string;
  port: number;
}

export interface RegisteredPrinter extends Printer {
  printerToken: string;
}
