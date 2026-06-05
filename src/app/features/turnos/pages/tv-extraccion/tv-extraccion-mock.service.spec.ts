import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TvExtraccionMockService } from './tv-extraccion-mock.service';

describe('TvExtraccionMockService', () => {
  let service: TvExtraccionMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TvExtraccionMockService);
  });

  it('fetchSnapshot returns 6 entries with boxNumber 1..3', async () => {
    const snap = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    expect(snap.entries.length).toBe(6);
    expect(snap.entries.every(e => e.boxNumber !== undefined && e.boxNumber >= 1 && e.boxNumber <= 3)).toBe(true);
    expect(snap.branchName).toBe('Sucursal Centro');
    expect(snap.openWindow).toEqual({ startTime: '00:00', endTime: '23:59' });
  });

  it('simulateNewCall prepends a new entry with lastCalledAt set to now', async () => {
    const before = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    const beforeFirstId = before.entries[0].id;

    service.simulateNewCall();

    const after = await firstValueFrom(service.fetchSnapshot('lab-demo', 1001));
    expect(after.entries.length).toBe(7);
    expect(after.entries[0].id).not.toBe(beforeFirstId);
    expect(after.entries[0].lastCalledAt).toBeTruthy();
    expect(after.entries[0].boxNumber).toBeGreaterThanOrEqual(1);
    expect(after.entries[0].boxNumber).toBeLessThanOrEqual(3);
  });

  it('listPublicBranches returns a single mock branch', async () => {
    const branches = await firstValueFrom(service.listPublicBranches('lab-demo'));
    expect(branches.length).toBe(1);
    expect(branches[0].id).toBe(1001);
  });
});
