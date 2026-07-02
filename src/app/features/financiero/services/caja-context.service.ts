import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'financiero.selectedCashRegister';

interface StoredSelection {
  branchId: number;
  cashRegisterId: number;
}

/**
 * Contexto de la subcaja seleccionada por el operador (KAN-156, multi-caja).
 *
 * La apertura/cierre/actividad/movimientos de caja operan SIEMPRE sobre una
 * subcaja concreta (`cashRegisterId`), no sobre la sucursal. La selección se
 * persiste en localStorage por sucursal para sobrevivir reloads y para que el
 * flujo de cobro (que se puede abrir como ruta standalone) sepa a qué caja
 * imputar el efectivo.
 *
 * Es contexto de UI local (no una petición al backend), por eso vive en un
 * service con signals — mismo precedente que `OperatorBranchContextService`.
 */
@Injectable({ providedIn: 'root' })
export class CajaContextService {
  private readonly _selectedRegisterId = signal<number | null>(null);
  private readonly _branchId = signal<number | null>(null);

  readonly selectedRegisterId = this._selectedRegisterId.asReadonly();

  constructor() {
    const stored = this.read();
    if (stored) {
      this._branchId.set(stored.branchId);
      this._selectedRegisterId.set(stored.cashRegisterId);
    }
  }

  /** Devuelve la caja seleccionada para una sucursal, o null si no coincide/no hay. */
  selectedFor(branchId: number): number | null {
    return this._branchId() === branchId ? this._selectedRegisterId() : null;
  }

  select(branchId: number, cashRegisterId: number): void {
    const payload: StoredSelection = { branchId, cashRegisterId };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage no disponible: la selección queda solo en memoria */
    }
    this._branchId.set(branchId);
    this._selectedRegisterId.set(cashRegisterId);
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    this._branchId.set(null);
    this._selectedRegisterId.set(null);
  }

  private read(): StoredSelection | null {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredSelection;
      if (typeof parsed?.branchId === 'number' && typeof parsed?.cashRegisterId === 'number') {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }
}
