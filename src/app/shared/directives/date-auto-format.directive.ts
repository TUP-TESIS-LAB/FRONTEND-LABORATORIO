import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Auto-formatea un input de fecha mientras el usuario tipea: convierte
 * `24062003` → `24/06/2003` sin que tenga que escribir los `/`.
 *
 * Aplicar como atributo en cualquier elemento que CONTENGA un `<input>`
 * (típicamente `<p-datepicker appDateAutoFormat>` — escucha el event input
 * burbujeado y reformatea el value del input interno).
 *
 * Restricciones:
 * - Solo acepta dígitos (descarta cualquier otro caracter).
 * - Cap a 8 dígitos (ddmmyyyy).
 * - Inserta `/` después del día (pos 2) y del mes (pos 4).
 * - Después de reformatear re-dispatcha el input event así PrimeNG /
 *   FormControl ven el nuevo value y lo parsean según `dateFormat`.
 */
@Directive({
  selector: '[appDateAutoFormat]',
  standalone: true,
})
export class DateAutoFormatDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private formatting = false;

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    if (this.formatting) return;
    const input = event.target instanceof HTMLInputElement
      ? event.target
      : this.host.nativeElement.querySelector('input');
    if (!input) return;

    const raw = input.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }

    if (formatted === input.value) return;

    this.formatting = true;
    input.value = formatted;
    // Mantener el cursor al final del valor formateado.
    input.setSelectionRange(formatted.length, formatted.length);
    // Re-dispatch para que PrimeNG / FormControl re-parseen el value.
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.formatting = false;
  }
}
