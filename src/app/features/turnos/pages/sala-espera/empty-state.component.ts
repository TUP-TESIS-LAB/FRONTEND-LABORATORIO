import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Estado vacío compartido por las TV públicas (sala de espera y extracción).
 *
 * Las dos pantallas cuelgan en la misma sala, así que el "no hay nada que mostrar"
 * tiene que leerse igual en ambas: título grande centrado + meta discreta abajo.
 * Sólo cambia el texto — cada TV dice lo suyo (`title`), el layout es el mismo.
 *
 * `serverTime` es opcional: el snapshot de extracción no lo trae, y preferimos
 * ocultar la hora antes que inventarla con el reloj del cliente (dos TV con la
 * misma hora pero de fuentes distintas se desincronizan a la vista).
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <h1>{{ title }}</h1>
      <div class="meta">
        @if (serverTime) {
          <span class="time">{{ serverTime }} hs</span>
        }
        <span class="branch">{{ branchName }}</span>
      </div>
    </div>
  `,
  styles: [`
    /* Ambas TV lo montan como hijo de un flex column (.cola-section): con flex:1 el
       host ocupa el alto libre y el contenido queda centrado vertical de verdad. */
    :host { display: flex; flex: 1; min-height: 0; }
    .wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2rem; }
    h1 { font-size: 4rem; opacity: 0.7; text-align: center; }
    .meta { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; opacity: 0.5; font-size: 1.5rem; }
  `],
})
export class EmptyStateComponent {
  /** Título grande. Default: el de la TV de sala de espera. */
  @Input() title = 'Esperando pacientes';
  @Input() serverTime = '';
  @Input() branchName = '';
}
