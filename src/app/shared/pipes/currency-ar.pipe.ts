import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyAr', standalone: true })
export class CurrencyArPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '';
    return this.formatter.format(value);
  }
}
