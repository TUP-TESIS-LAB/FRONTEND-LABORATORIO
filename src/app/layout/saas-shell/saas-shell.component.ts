import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaasSidebarComponent } from './saas-sidebar/saas-sidebar.component';
import { SaasTopbarComponent } from './saas-topbar/saas-topbar.component';

@Component({
  selector: 'saas-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SaasSidebarComponent, SaasTopbarComponent],
  template: `
    <saas-topbar />
    <div class="saas-shell__body">
      <saas-sidebar />
      <main class="saas-shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    /*
     * Consola de plataforma (SaaS Admin): tema CLARO con identidad propia.
     * Acento índigo (#6366f1) para diferenciarla del front de laboratorio
     * (azul de marca). Se reusan los componentes del design system (ui-table,
     * ui-stat-card, etc.); overrideamos --brand-* y --p-primary-* SOLO dentro
     * de esta consola para teñirlos de índigo sin tocar el resto de la app.
     */
    :host {
      /* Identidad de la consola */
      --saas-accent:        #6366f1;
      --saas-accent-strong: #4f46e5;
      --saas-accent-tint:   rgba(99,102,241,.10);

      /* Superficies claras (reusan los neutros del DS) */
      --saas-bg-page:      var(--ds-bg, #f7f8fa);
      --saas-surface:      #ffffff;
      --saas-surface-alt:  #f9fafb;
      --saas-border:       var(--ds-border, #e6e8ef);
      --saas-text:         var(--ds-text, #1a1a2e);
      --saas-text-muted:   var(--ds-text-muted, #6b7280);

      /* Aliases de compatibilidad (nombres viejos del tema oscuro → valores claros) */
      --saas-bg-card:      var(--saas-surface);
      --saas-bg-card-alt:  var(--saas-surface-alt);
      --saas-text-on-card: var(--saas-text);

      /* Teñir los componentes del DS y PrimeNG con el acento índigo (scoped) */
      --brand-primary:   var(--saas-accent);
      --brand-secondary: #8b5cf6;
      --p-primary-color: var(--saas-accent);
      --p-primary-contrast-color: #ffffff;

      /* Escala primary completa → índigo. IMPRESCINDIBLE: el palette primary por
         defecto de Aura es ESMERALDA (verde); pisar solo --p-primary-color no
         alcanza porque muchos componentes derivan de --p-primary-200/500/... (el
         borde verde del outlined "Editar", toggles, focus rings salían de ahí). */
      --p-primary-50:  #eef2ff;
      --p-primary-100: #e0e7ff;
      --p-primary-200: #c7d2fe;
      --p-primary-300: #a5b4fc;
      --p-primary-400: #818cf8;
      --p-primary-500: #6366f1;
      --p-primary-600: #4f46e5;
      --p-primary-700: #4338ca;
      --p-primary-800: #3730a3;
      --p-primary-900: #312e81;
      --p-primary-950: #1e1b4b;

      /* Botón primario: pinneamos los tokens directos para que TODOS los
         p-button primary rindan el mismo índigo (PrimeNG deriva el fondo de
         una escala interna, así que sin esto el matiz varía por contexto). */
      --p-button-primary-background:            var(--saas-accent-strong);
      --p-button-primary-border-color:          var(--saas-accent-strong);
      --p-button-primary-color:                 #ffffff;
      --p-button-primary-hover-background:       #4338ca;
      --p-button-primary-hover-border-color:     #4338ca;
      --p-button-primary-active-background:      #3730a3;
      --p-button-primary-active-border-color:    #3730a3;

      display: flex; flex-direction: column; min-height: 100vh;
      background: var(--saas-bg-page); color: var(--saas-text);
    }
    .saas-shell__body { display: flex; flex: 1; min-height: 0; }
    .saas-shell__main { flex: 1; padding: var(--space-6, 24px); overflow-x: hidden; }

    @media (max-width: 767px) {
      .saas-shell__main { padding: var(--space-4, 16px); }
    }

    /*
     * Botones outlined de la consola. PrimeNG los renderiza con bordes de
     * severidad muy claros (el verde #a7f3d0 de success casi no se veía sobre
     * blanco) y con hover de fill de color saturado (verde/gris). Unificamos:
     * - terciarios (secondary/success/info): borde y texto neutros, hover gris.
     * - warn/danger: mantienen su color pero con borde visible y hover con
     *   tinte suave (no fill saturado).
     * El "Editar" (primary outlined, sin clase de severidad) queda intacto en índigo.
     */
    /* Primary outlined (ej. "Editar"): borde índigo visible (el --p-primary-200
       queda muy claro sobre blanco) + hover con tinte índigo. */
    :host ::ng-deep .p-button-outlined:not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warn):not(.p-button-danger):not(.p-button-help):not(.p-button-contrast) {
      border-color: var(--saas-accent) !important;
      color: var(--saas-accent-strong) !important;
    }
    :host ::ng-deep .p-button-outlined:not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warn):not(.p-button-danger):not(.p-button-help):not(.p-button-contrast):not(:disabled):hover {
      background: var(--saas-accent-tint) !important;
      border-color: var(--saas-accent) !important;
      color: var(--saas-accent-strong) !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-secondary,
    :host ::ng-deep .p-button-outlined.p-button-success,
    :host ::ng-deep .p-button-outlined.p-button-info {
      border-color: var(--saas-border) !important;
      color: var(--saas-text) !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-secondary:not(:disabled):hover,
    :host ::ng-deep .p-button-outlined.p-button-success:not(:disabled):hover,
    :host ::ng-deep .p-button-outlined.p-button-info:not(:disabled):hover {
      background: var(--saas-surface-alt) !important;
      border-color: #cbd5e1 !important;
      color: var(--saas-text) !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-warn {
      border-color: #d97706 !important;
      color: #b45309 !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-warn:not(:disabled):hover {
      background: #fff7ed !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-danger {
      border-color: #dc2626 !important;
      color: #b91c1c !important;
    }
    :host ::ng-deep .p-button-outlined.p-button-danger:not(:disabled):hover {
      background: #fef2f2 !important;
    }
  `],
})
export class SaasShellComponent {}
