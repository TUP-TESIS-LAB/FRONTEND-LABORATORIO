import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateEs', standalone: true })
export class DateEsPipe implements PipeTransform {
  private readonly formatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    return this.formatter.format(new Date(value));
  }
}
