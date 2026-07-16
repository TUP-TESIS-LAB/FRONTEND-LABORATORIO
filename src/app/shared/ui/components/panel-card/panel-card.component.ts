import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Contenedor genérico de "panel" (gráfico, tabla, bloque de contenido) con título
 * opcional. Reemplaza las clases `.metrics-tab__chart-card`/`.metrics-tab__table`
 * copy-pasteadas en cada tab del dashboard de métricas — mismo look que
 * `ui-stat-card`/`ui-list-card` (fondo blanco, radio 10px, borde sutil).
 */
@Component({
  selector: 'ui-panel-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-panel-card">
      @if (title()) {
        <h3 class="ui-panel-card__title">{{ title() }}</h3>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .ui-panel-card {
      background: white;
      border-radius: 10px;
      padding: var(--space-4);
      border: 1px solid var(--ds-border);
    }
    .ui-panel-card__title {
      margin: 0 0 var(--space-3);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--ds-text);
    }
  `],
})
export class PanelCardComponent {
  readonly title = input<string | null>(null);
}
