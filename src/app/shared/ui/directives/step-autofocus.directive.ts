import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Selector de controles enfocables. Cubre los inputs nativos + PrimeNG (que
 * renderiza inputs/botones nativos por debajo) + cualquier elemento con
 * tabindex >= 0. Se excluyen los hidden y los tabindex="-1".
 */
const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[contenteditable="true"]',
  'button',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Directiva reutilizable de autofoco para steppers.
 *
 * Se aplica en la shell/header del stepper (vía `hostDirectives`) y la shell la
 * dispara con {@link onStepChanged} cada vez que cambia de paso. La directiva
 * lleva el foco al PRIMER control enfocable del contenido del paso nuevo, sin
 * que cada stepper tenga que implementarlo.
 *
 * Estrategia de búsqueda: el contenido del paso siempre va DESPUÉS del header en
 * el DOM (header → contenido → footer), pero no siempre es hermano directo (en
 * atención el header está envuelto en un wrapper). Por eso subimos por los
 * ancestros y, en cada nivel, tomamos el primer control que:
 *   - sigue al header en orden de documento,
 *   - no pertenece al propio header,
 *   - no está dentro de un `<footer>` (la botonera de pie),
 *   - es visible y está habilitado.
 */
@Directive({
  selector: '[uiStepAutofocus]',
  standalone: true,
})
export class StepAutofocusDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Avisa que se cambió de paso. Difiere el foco al próximo tick porque el
   * contenido del paso nuevo se renderiza en el mismo ciclo de detección de
   * cambios y necesitamos leer el DOM ya actualizado.
   */
  onStepChanged(): void {
    setTimeout(() => this.focusFirstControl(), 0);
  }

  /** Enfoca el primer control del paso actual (público para test/uso directo). */
  focusFirstControl(): void {
    this.findFirstControl()?.focus();
  }

  private findFirstControl(): HTMLElement | null {
    const header = this.host;
    let scope: HTMLElement | null = header.parentElement;
    while (scope) {
      for (const el of Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))) {
        if (header.contains(el)) continue;
        if (el.closest('footer')) continue;
        const rel = header.compareDocumentPosition(el);
        if (!(rel & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        if (!this.isFocusable(el)) continue;
        return el;
      }
      scope = scope.parentElement;
    }
    return null;
  }

  private isFocusable(el: HTMLElement): boolean {
    if ((el as HTMLInputElement).disabled) return false;
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
    if (!el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    // En un navegador con layout descartamos además los elementos sin caja
    // (ocultos por CSS de clase, colapsados, etc.). En entornos sin motor de
    // layout (jsdom) no hay cajas para nadie, así que confiamos en estilos/atributos.
    const hasLayout = document.body.getClientRects().length > 0;
    if (hasLayout) return el.offsetParent !== null || el.getClientRects().length > 0;
    return true;
  }
}
