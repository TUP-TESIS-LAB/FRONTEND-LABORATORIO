import { Injectable, signal } from '@angular/core';

/**
 * Bus para que el botón "Guardar cambios" del header de Empresa (componente padre)
 * opere sobre la pantalla Informe PDF (hija del router-outlet). La page publica su
 * estado `dirty` y registra su handler de guardado; el header lee `dirty` para
 * habilitar/mostrar el botón y llama `save()` al hacer click.
 *
 * Inverso al UsuariosCreateBus: acá el header NO dispara una acción ciega, sino que
 * refleja y ejecuta el estado de la page activa.
 */
@Injectable({ providedIn: 'root' })
export class InformePdfSaveBus {
  /** true cuando la page Informe PDF tiene cambios sin guardar. */
  readonly dirty = signal(false);

  private handler: (() => void) | null = null;

  /** La page registra su lógica de guardado al activarse y la limpia al destruirse. */
  register(handler: (() => void) | null): void {
    this.handler = handler;
  }

  /** El header invoca esto al hacer click en "Guardar cambios". */
  save(): void {
    this.handler?.();
  }
}
