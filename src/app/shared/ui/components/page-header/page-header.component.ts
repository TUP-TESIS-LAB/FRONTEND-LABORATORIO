import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Header estándar de las pantallas no-wizard del portal administrativo.
 *
 * Unifica el "título de pantalla" que antes cada page resolvía a mano (con
 * tags distintos —h1/h2—, tamaños y paddings dispares). Garantiza que el título
 * vaya SIEMPRE en el mismo lugar (arriba-izquierda), con el mismo tamaño (22px)
 * y espesor (700), y deja un margen inferior fijo para que el contenido arranque
 * a la misma altura en todas las pantallas.
 *
 * El padding exterior NO lo maneja este componente: lo aporta el
 * `.ui-admin-shell__content` (var(--space-6) desktop / var(--space-4) mobile).
 * Las pages NO deben agregar su propio padding de contenedor (p-6/p-8/etc.).
 *
 * Las acciones (búsqueda, botón "Nuevo X", etc.) se proyectan a la derecha.
 *
 * ```html
 * <ui-page-header heading="Pacientes" subtitle="Listado de pacientes del laboratorio.">
 *   <p-button label="Nuevo paciente" />
 * </ui-page-header>
 * ```
 */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ui-page-header">
      <div class="ui-page-header__main">
        <h1 class="ui-page-header__title">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="ui-page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="ui-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .ui-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
      flex-wrap: wrap;
    }
    .ui-page-header__main { min-width: 0; }
    .ui-page-header__title {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      color: var(--ds-text);
      margin: 0;
    }
    .ui-page-header__subtitle {
      font-size: 13.5px;
      font-weight: 400;
      color: var(--ds-text-muted);
      line-height: 1.45;
      margin: 4px 0 0;
      max-width: 720px;
    }
    .ui-page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }
    .ui-page-header__actions:empty { display: none; }
  `],
})
export class PageHeaderComponent {
  /** Título de la pantalla (h1). */
  readonly heading = input.required<string>();
  /** Subtítulo opcional (texto muted debajo del título). */
  readonly subtitle = input<string>('');
}
