import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { PollingService } from './polling.service';

describe('PollingService', () => {
  let service: PollingService;
  let originalHidden: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [PollingService] });
    service = TestBed.inject(PollingService);
    originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalHidden) {
      Object.defineProperty(Document.prototype, 'hidden', originalHidden);
    }
  });

  function setHidden(value: boolean): void {
    Object.defineProperty(document, 'hidden', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('fires the first poll immediately and again after the interval', () => {
    const poll = vi.fn().mockReturnValue(new Subject().asObservable());
    const handle = service.startPolling({ key: 'k', intervalMs: 1000, poll });
    expect(poll).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(poll).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1000);
    expect(poll).toHaveBeenCalledTimes(3);
    handle.stop();
  });

  it('pauses while document.hidden=true and pokes once on visible', () => {
    const poll = vi.fn().mockReturnValue(new Subject().asObservable());
    const handle = service.startPolling({ key: 'k', intervalMs: 1000, poll });
    expect(poll).toHaveBeenCalledTimes(1);

    setHidden(true);
    vi.advanceTimersByTime(5000);
    // Mientras está oculto no se dispara nada extra.
    expect(poll).toHaveBeenCalledTimes(1);

    setHidden(false);
    // Al volver visible: poke inmediato + el `startWith(0)` del nuevo stream.
    expect(poll.mock.calls.length).toBeGreaterThanOrEqual(2);
    handle.stop();
  });

  it('pokeNow triggers an extra poll', () => {
    const poll = vi.fn().mockReturnValue(new Subject().asObservable());
    const handle = service.startPolling({ key: 'k', intervalMs: 10000, poll });
    expect(poll).toHaveBeenCalledTimes(1);
    handle.pokeNow();
    expect(poll).toHaveBeenCalledTimes(2);
    handle.stop();
  });

  it('setActive(false) pauses polling until reactivated', () => {
    const poll = vi.fn().mockReturnValue(new Subject().asObservable());
    const handle = service.startPolling({ key: 'k', intervalMs: 500, poll });
    expect(poll).toHaveBeenCalledTimes(1);
    handle.setActive(false);
    vi.advanceTimersByTime(2000);
    expect(poll).toHaveBeenCalledTimes(1);
    handle.setActive(true);
    // Al reactivar dispara inmediato.
    expect(poll).toHaveBeenCalledTimes(2);
    handle.stop();
  });

  it('stop() unsubscribes and prevents further polls', () => {
    const poll = vi.fn().mockReturnValue(new Subject().asObservable());
    const handle = service.startPolling({ key: 'k', intervalMs: 500, poll });
    handle.stop();
    vi.advanceTimersByTime(5000);
    expect(poll).toHaveBeenCalledTimes(1);
  });
});
