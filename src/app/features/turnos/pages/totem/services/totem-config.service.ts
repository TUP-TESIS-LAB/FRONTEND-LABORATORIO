import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'totem.branchId';
const SLUG_KEY = 'totem.slug';

@Injectable({ providedIn: 'root' })
export class TotemConfigService {
  private readonly _branchId = signal<number | null>(this.readFromStorage());
  private readonly _slug = signal<string | null>(localStorage.getItem(SLUG_KEY));

  readonly branchId = this._branchId.asReadonly();
  readonly slug = this._slug.asReadonly();

  setBranchId(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
    this._branchId.set(id);
  }

  setSlug(slug: string): void {
    localStorage.setItem(SLUG_KEY, slug);
    this._slug.set(slug);
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
