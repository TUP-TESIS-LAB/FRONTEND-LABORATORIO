import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NegritaPipe } from '../pipes/negrita.pipe';

/**
 * Renderiza un texto del manual resolviendo los marcadores `**negrita**`.
 *
 * El template va en **una sola línea** a propósito: si los tramos se separan con
 * saltos de línea, Angular los colapsa a un espacio y la puntuación queda
 * despegada ("tocá Guardar ." en vez de "tocá Guardar."). Con la negrita siendo
 * casi siempre un nombre de botón seguido de coma o punto, eso aparecía decenas
 * de veces en el manual.
 *
 * Existe además para no repetir el mismo bloque en párrafos, pasos y viñetas.
 */
@Component({
  selector: 'lab-texto-manual',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NegritaPipe],
  template: `@for (tramo of texto() | negrita; track $index) {@if (tramo.fuerte) {<strong>{{ tramo.texto }}</strong>}@else {<span>{{ tramo.texto }}</span>}}`,
})
export class TextoManualComponent {
  readonly texto = input<string | null | undefined>('');
}
