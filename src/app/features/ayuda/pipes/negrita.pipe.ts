import { Pipe, PipeTransform } from '@angular/core';

/** Un tramo de texto del manual, marcado o no como negrita. */
export interface TramoTexto {
  texto: string;
  fuerte: boolean;
}

/**
 * Parte un texto del manual en tramos según los marcadores `**...**`.
 *
 * En este manual la negrita marca nombres de botones, pestañas y estados de la
 * app ("tocá **Guardar**"), así que es información y no decoración: perderla
 * empeora las instrucciones.
 *
 * Se resuelve partiendo el string y dejando que el template dibuje `<strong>`
 * sobre cada tramo. No usa `innerHTML` ni sanitizer, así que no abre superficie
 * de inyección aunque el texto venga del backend.
 */
@Pipe({ name: 'negrita', standalone: true })
export class NegritaPipe implements PipeTransform {
  transform(value: string | null | undefined): TramoTexto[] {
    if (!value) {
      return [];
    }
    // Los delimitadores quedan en el resultado del split, así que los tramos
    // impares son exactamente el contenido entre pares de `**`.
    const partes = value.split('**');
    return partes
      .map((texto, i) => ({ texto, fuerte: i % 2 === 1 }))
      .filter((tramo) => tramo.texto.length > 0);
  }
}
