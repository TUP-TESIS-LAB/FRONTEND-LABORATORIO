import { Injectable, computed, signal } from '@angular/core';

const BOX_KEY = 'extractor.box';
const BRANCH_KEY = 'extractor.branchId';

/**
 * Single source of truth para el "box" y la sucursal actual del extractor.
 *
 * - Box y branchId persisten en localStorage del browser (por user/PC).
 * - El drawer "Tomar paciente" autocompleta el box desde acá.
 * - El FAB del header lo muestra y permite cambiarlo.
 * - El chip de sucursal sincroniza `selectedBranchId` con el store.
 *
 * No hay catálogo de boxes en backend — es un entero por extractor.
 */
@Injectable({ providedIn: 'root' })
export class ExtractorBoxService {
  private readonly _box = signal<number | null>(readNumber(BOX_KEY));
  private readonly _selectedBranchId = signal<number | null>(readNumber(BRANCH_KEY));

  /** Box actual o null si nunca lo seteó. */
  readonly box = this._box.asReadonly();

  /** Sucursal seleccionada o null si todavía no hay una. */
  readonly selectedBranchId = this._selectedBranchId.asReadonly();

  /** Habilita "Tomar" sólo cuando hay box y sucursal. */
  readonly canTake = computed(
    () => this._box() != null && this._selectedBranchId() != null,
  );

  setBox(value: number): void {
    if (!Number.isInteger(value) || value < 1) return;
    this._box.set(value);
    writeNumber(BOX_KEY, value);
  }

  clear(): void {
    this._box.set(null);
    removeKey(BOX_KEY);
  }

  /**
   * Setear la sucursal actual. Si cambió respecto de la previa, también
   * limpiamos el box porque el catálogo de boxes ocupados pertenece a otra
   * sucursal y deja de tener sentido como "tu" box.
   */
  setSelectedBranch(id: number | null): void {
    const prev = this._selectedBranchId();
    if (prev === id) return;
    this._selectedBranchId.set(id);
    if (id == null) {
      removeKey(BRANCH_KEY);
    } else {
      writeNumber(BRANCH_KEY, id);
    }
    // Si la sucursal cambió, el box anterior podía estar ocupado por otro
    // extractor en la nueva sucursal: lo descartamos por seguridad.
    if (prev != null && id !== prev) {
      this.clear();
    }
  }
}

function readNumber(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 ? n : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore (quota / modo privado)
  }
}

function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
