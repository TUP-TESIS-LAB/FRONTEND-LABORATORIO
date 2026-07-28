import { ManualChapter } from '../models/manual.model';

/**
 * Recorta el manual a lo que la persona puede hacer.
 *
 * Reglas, alineadas con cómo el sidebar decide qué mostrar:
 * - Sección sin códigos → transversal, la ve todo el staff.
 * - Sección con códigos → alcanza con tener **uno** (un área del manual puede
 *   abarcar varias secciones de acceso; por ejemplo el circuito de la muestra
 *   cruza preanalítica, analítica y postanalítica).
 * - Un capítulo que se queda sin secciones desaparece del índice.
 *
 * Es una función pura a propósito: es la regla que decide qué información se le
 * esconde a alguien, y equivocarse ahí no lo agarra ningún test de UI.
 */
export function filtrarPorAcceso(
  chapters: ManualChapter[],
  tieneAcceso: (codigo: string) => boolean,
): ManualChapter[] {
  return chapters
    .map((chapter) => ({
      ...chapter,
      sections: chapter.sections.filter(
        (section) =>
          section.accessSections.length === 0 || section.accessSections.some(tieneAcceso),
      ),
    }))
    .filter((chapter) => chapter.sections.length > 0);
}

/** Cuántas secciones quedan fuera del recorte. 0 = no hay nada más para mostrar. */
export function contarOcultas(
  todos: ManualChapter[],
  visibles: ManualChapter[],
): number {
  const total = todos.reduce((n, c) => n + c.sections.length, 0);
  return total - visibles.reduce((n, c) => n + c.sections.length, 0);
}
