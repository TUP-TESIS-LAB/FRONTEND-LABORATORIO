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
  `],
})
export class SaasShellComponent {}
