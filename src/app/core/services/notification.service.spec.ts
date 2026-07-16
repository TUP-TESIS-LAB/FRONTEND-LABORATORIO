import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrega la notificación al mostrarla', () => {
    service.success('Listo');
    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].summary).toBe('Listo');
  });

  it('auto-descarta la notificación a los 5s', () => {
    service.success('Extracción cancelada.');
    expect(service.notifications().length).toBe(1);

    vi.advanceTimersByTime(4999);
    expect(service.notifications().length).toBe(1);

    vi.advanceTimersByTime(1);
    expect(service.notifications().length).toBe(0);
  });

  it('descarta cada notificación de forma independiente (no se apilan)', () => {
    service.success('Uno');
    vi.advanceTimersByTime(2000);
    service.success('Dos');

    // A los 5s de la primera, sólo se va la primera.
    vi.advanceTimersByTime(3000);
    expect(service.notifications().map((n) => n.summary)).toEqual(['Dos']);

    // A los 5s de la segunda, se va también.
    vi.advanceTimersByTime(2000);
    expect(service.notifications().length).toBe(0);
  });

  it('con autoDismissMs = 0 la notificación queda fija', () => {
    service.show('error', 'Algo falló', undefined, 0);
    vi.advanceTimersByTime(60_000);
    expect(service.notifications().length).toBe(1);
  });
});
