import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convierte un ISO timestamp (ej. createdAt de QueueEntry) en una etiqueta
 * legible del tiempo transcurrido desde entonces: "ahora", "5 min",
 * "1 h 20 min", etc. Pipe puro: se recalcula en cada CD del componente,
 * que en la tabla de Recepcion ocurre cada 5s con el polling del queue.
 *
 * Si el input es null/undefined/invalido devuelve "—".
 */
@Pipe({
  name: 'waitingTime',
  standalone: true,
})
export class WaitingTimePipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '—';
    const startMs = Date.parse(iso);
    if (Number.isNaN(startMs)) return '—';

    const elapsedMs = Date.now() - startMs;
    if (elapsedMs < 0) return 'ahora';

    const totalMinutes = Math.floor(elapsedMs / 60_000);
    if (totalMinutes < 1) return 'ahora';
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }
}
