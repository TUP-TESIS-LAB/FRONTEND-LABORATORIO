import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'turnos.operatorBranchId';

/**
 * Branch contexto del operador (recepcionista / admin) para pantallas de
 * turnos. Persistido en localStorage para sobrevivir reloads -- el usuario
 * tipicamente trabaja siempre en la misma sucursal pero puede cambiar via
 * el FAB flotante.
 *
 * NO es el mismo branchId del totem (totem-config.service tiene su propia
 * key) porque son dispositivos distintos con politicas distintas: el totem
 * vive fijo en una sucursal, el operador puede cambiar.
 */
@Injectable({ providedIn: 'root' })
export class OperatorBranchContextService {
  private readonly _branchId = signal<number | null>(this.readFromStorage());

  readonly branchId = this._branchId.asReadonly();

  setBranchId(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
    this._branchId.set(id);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._branchId.set(null);
  }

  private readFromStorage(): number | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
