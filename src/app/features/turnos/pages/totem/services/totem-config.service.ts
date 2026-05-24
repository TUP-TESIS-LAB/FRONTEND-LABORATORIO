import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'totem.branchId';

@Injectable({ providedIn: 'root' })
export class TotemConfigService {
  private readonly _branchId = signal<number | null>(this.readFromStorage());

  readonly branchId = this._branchId.asReadonly();

  setBranchId(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
    this._branchId.set(id);
  }

  clearBranchId(): void {
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
