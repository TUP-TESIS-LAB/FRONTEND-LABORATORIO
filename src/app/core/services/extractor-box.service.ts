import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'extractor.box';

/**
 * Single source of truth para el "box" actual del extractor.
 *
 * - Persistido en localStorage del browser (no se mueve entre PCs).
 * - El drawer "Tomar paciente" lo autocompleta desde acá.
 * - El FAB lo muestra y permite cambiarlo sin tener que abrir el drawer.
 *
 * No hay catálogo de boxes en backend — es solo un número entero por extractor.
 */
@Injectable({ providedIn: 'root' })
export class ExtractorBoxService {
  private readonly _box = signal<number | null>(readFromStorage());

  /** Box actual o null si nunca lo seteó. Reactive. */
  readonly box = this._box.asReadonly();

  setBox(value: number): void {
    if (!Number.isInteger(value) || value < 1) return;
    this._box.set(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignoramos errores de quota / modo privado.
    }
  }

  clear(): void {
    this._box.set(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function readFromStorage(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 ? n : null;
  } catch {
    return null;
  }
}
