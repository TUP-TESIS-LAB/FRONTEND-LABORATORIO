import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dni', standalone: true })
export class DniPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7) return value;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
