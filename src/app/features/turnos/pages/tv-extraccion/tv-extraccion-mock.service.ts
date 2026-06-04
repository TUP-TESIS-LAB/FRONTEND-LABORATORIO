import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { QueueStatus } from '../../models/queue-status.enum';
import { PublicBranch } from '../../services/public-display.service';

/**
 * Mock de la TV de extracción. Reemplaza a `PublicDisplayService` hasta que
 * exista el endpoint `/public/display/extraccion/:tenant/:branch/queue`.
 *
 * El snapshot vive en un signal mutable; `simulateNewCall()` lo muta para
 * que el componente (vía polling) detecte el cambio y dispare el beep.
 */
@Injectable({ providedIn: 'root' })
export class TvExtraccionMockService {
  private nextId = 1000;
  private readonly snapshot = signal<DisplaySnapshot>(this.buildInitialSnapshot());

  fetchSnapshot(_tenantSlug: string, _branchId: number): Observable<DisplaySnapshot> {
    return of(this.snapshot()).pipe(delay(30));
  }

  listPublicBranches(_tenantSlug: string): Observable<PublicBranch[]> {
    return of([
      { id: 1001, code: 'LAB-CENTRO', description: 'Sucursal Centro' },
    ]);
  }

  /** Dispara desde el botón "Simular llamada" del componente. */
  simulateNewCall(): void {
    const next = this.buildNewEntry();
    this.snapshot.update(snap => ({
      ...snap,
      entries: [next, ...snap.entries].slice(0, 12),
    }));
  }

  private buildInitialSnapshot(): DisplaySnapshot {
    const baseTime = Date.now();
    const entries: PublicQueueEntry[] = Array.from({ length: 6 }, (_, i) => ({
      id: ++this.nextId,
      publicCode: `EX-${String(i + 1).padStart(3, '0')}`,
      status: QueueStatus.PENDING,
      lastCalledAt: new Date(baseTime - (i + 1) * 60_000).toISOString(),
      callCount: 1,
      createdAt: new Date(baseTime - (i + 1) * 300_000).toISOString(),
      boxNumber: (i % 3) + 1,
    }));
    return {
      tenantName: 'Laboratorio Demo',
      branchName: 'Sucursal Centro',
      serverTime: this.hhmm(new Date()),
      openWindow: { startTime: '08:00', endTime: '18:00' },
      entries,
    };
  }

  private buildNewEntry(): PublicQueueEntry {
    const id = ++this.nextId;
    return {
      id,
      publicCode: `EX-${String(id % 1000).padStart(3, '0')}`,
      status: QueueStatus.PENDING,
      lastCalledAt: new Date().toISOString(),
      callCount: 1,
      createdAt: new Date().toISOString(),
      boxNumber: Math.floor(Math.random() * 3) + 1,
    };
  }

  private hhmm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
