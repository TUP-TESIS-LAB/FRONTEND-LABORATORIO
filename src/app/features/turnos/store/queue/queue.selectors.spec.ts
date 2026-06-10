import { QueueStatus } from '../../models/queue-status.enum';
import { QueueEntry } from '../../models/queue-entry.model';
import { QueueState } from './queue.state';
import { selectQueueEntriesAll, selectQueueEntriesToday } from './queue.selectors';

/** ISO local (sin Z) a las 10:00 del día de `d`. */
function localIsoAt10(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00:00`;
}

function entry(over: Partial<QueueEntry>): QueueEntry {
  return {
    id: 0,
    publicCode: 'CT-0001',
    nationalId: '',
    patientId: null,
    branchId: 1,
    appointmentId: null,
    hasAppointment: true,
    status: QueueStatus.PENDING,
    lastCalledAt: null,
    callCount: 0,
    createdAt: '2026-06-02T09:00:00Z',
    ...over,
  };
}

describe('selectQueueEntriesAll', () => {
  function state(entries: QueueEntry[]): { queue: QueueState } {
    return {
      queue: { entries, loading: false, callingId: null, error: null },
    };
  }

  it('combina CT y ST en una sola lista ordenada por createdAt asc', () => {
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, publicCode: 'CT-0001', createdAt: '2026-06-02T09:30:00Z' }),
      entry({ id: 2, publicCode: 'ST-0001', hasAppointment: false, createdAt: '2026-06-02T09:00:00Z' }),
      entry({ id: 3, publicCode: 'CT-0002', createdAt: '2026-06-02T09:15:00Z' }),
    ]));
    expect(result.map(e => e.id)).toEqual([2, 3, 1]);
  });

  it('filtra entries que no estan en PENDING', () => {
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, status: QueueStatus.PENDING }),
      entry({ id: 2, status: QueueStatus.COMPLETED }),
      entry({ id: 3, status: QueueStatus.CANCELED }),
    ]));
    expect(result.map(e => e.id)).toEqual([1]);
  });

  it('devuelve array vacio cuando no hay entries', () => {
    expect(selectQueueEntriesAll(state([]))).toEqual([]);
  });

  it('mantiene orden estable cuando createdAt es identico (preserva orden del input)', () => {
    const sameTime = '2026-06-02T09:00:00Z';
    const result = selectQueueEntriesAll(state([
      entry({ id: 1, publicCode: 'CT-0001', createdAt: sameTime }),
      entry({ id: 2, publicCode: 'ST-0001', hasAppointment: false, createdAt: sameTime }),
    ]));
    expect(result.map(e => e.id)).toEqual([1, 2]);
  });
});

describe('selectQueueEntriesToday', () => {
  function state(entries: QueueEntry[]): { queue: QueueState } {
    return { queue: { entries, loading: false, callingId: null, error: null } };
  }

  it('solo deja los que llegaron HOY; conserva los que no traen createdAt (defensivo)', () => {
    const now = new Date();
    const ayer = new Date(now); ayer.setDate(now.getDate() - 1);
    const result = selectQueueEntriesToday(state([
      entry({ id: 1, createdAt: localIsoAt10(now) }),   // hoy
      entry({ id: 2, createdAt: localIsoAt10(ayer) }),  // ayer
      entry({ id: 3, createdAt: '' }),                  // sin fecha → se conserva
    ]));
    expect(result.map(e => e.id).sort()).toEqual([1, 3]);
  });
});
