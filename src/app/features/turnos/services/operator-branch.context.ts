import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'turnos.operatorBranch';
const LEGACY_KEY = 'turnos.operatorBranchId';

interface StoredBranch {
  id: number;
  name: string | null;
}

/**
 * Branch contexto del operador (recepcionista / admin) para pantallas de
 * turnos. Persistido en localStorage para sobrevivir reloads.
 *
 * El staff NO cambia su propia sucursal (regla de negocio del 2026-06-02):
 * el admin la asigna. Este service expone ambas señales — id + name — para
 * que el badge del topbar pueda mostrar el nombre sin tener que pegarle
 * cada vez al backend.
 *
 * El FAB de dev (`operator-branch-fab.component`) sigue pudiendo escribir
 * acá vía setBranch para iterar en local.
 */
@Injectable({ providedIn: 'root' })
export class OperatorBranchContextService {
  private readonly _branchId = signal<number | null>(null);
  private readonly _branchName = signal<string | null>(null);

  readonly branchId = this._branchId.asReadonly();
  readonly branchName = this._branchName.asReadonly();

  constructor() {
    const stored = this.readFromStorage();
    if (stored) {
      this._branchId.set(stored.id);
      this._branchName.set(stored.name);
    }
  }

  setBranch(id: number, name: string): void {
    const payload: StoredBranch = { id, name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    this._branchId.set(id);
    this._branchName.set(name);
  }

  /**
   * Compat: sigue habilitado para flujos que solo conocen el id (ej: el FAB
   * de dev). El name queda null y el badge muestra "Sin sucursal" hasta que
   * alguien llame setBranch(id, name) con el name resuelto.
   */
  setBranchId(id: number): void {
    const payload: StoredBranch = { id, name: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    this._branchId.set(id);
    this._branchName.set(null);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    this._branchId.set(null);
    this._branchName.set(null);
  }

  private readFromStorage(): StoredBranch | null {
    // Preferir el key nuevo
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredBranch;
        if (typeof parsed?.id === 'number') return parsed;
      } catch {
        return null;
      }
      return null;
    }
    // Fallback al key legacy (migración silenciosa)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const id = Number(legacy);
      if (Number.isFinite(id)) return { id, name: null };
    }
    return null;
  }
}
