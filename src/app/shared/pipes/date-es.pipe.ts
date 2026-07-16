import { Pipe, PipeTransform } from '@angular/core';

export type DateEsMode = 'date' | 'datetime' | 'time';

@Pipe({ name: 'dateEs', standalone: true })
export class DateEsPipe implements PipeTransform {
  private readonly dateFmt = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  private readonly timeFmt = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  transform(value: string | Date | null | undefined, mode: DateEsMode = 'date'): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    if (mode === 'time') return this.timeFmt.format(d);
    if (mode === 'datetime') return `${this.dateFmt.format(d)} ${this.timeFmt.format(d)}`;
    return this.dateFmt.format(d);
  }
}
