import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';

/**
 * Shell estándar de wizards full-page del portal administrativo.
 *
 * Centraliza el "chrome" que antes estaba copiado a mano en cada wizard
 * (top bar + ui-form-stepper-header + body scrollable a 720px + footer de
 * navegación). Así todos los wizards comparten exactamente el mismo padding,
 * jerarquía tipográfica, estilo de botones y separadores — y nunca más se
 * desincronizan entre sí, igual que el propio `ui-form-stepper-header`.
 *
 * El cuerpo de cada paso se proyecta con `<ng-content>`; la lógica de
 * navegación y validación sigue viviendo en la page (que cablea los outputs).
 */
@Component({
  selector: 'ui-wizard-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, FormStepperHeaderComponent],
  template: `
    <div class="flex flex-col h-full">
      <header class="wz-bar wz-bar--top flex items-center gap-3 px-8 py-4 bg-surface-0 sticky top-0 z-10">
        <h1 class="text-xl font-bold m-0 leading-tight">{{ heading() }}</h1>
        @if (breadcrumb()) {
          <nav class="ml-auto text-xs text-surface-500">{{ breadcrumb() }}</nav>
        }
      </header>

      <ui-form-stepper-header
        [steps]="steps()"
        [currentIndex]="currentIndex()"
        [visited]="visited()"
        [clickable]="clickable()"
        (stepSelected)="stepSelected.emit($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        <div class="w-full mx-auto" [style.max-width]="maxWidth()">
          <ng-content />
        </div>
      </div>

      <footer class="wz-bar wz-bar--bottom flex items-center gap-3 px-8 py-4 bg-surface-0 sticky bottom-0">
        <span class="text-xs font-medium text-surface-500">
          Paso {{ currentIndex() + 1 }} de {{ steps().length }}
        </span>
        @if (customFooter()) {
          <!--
            Footer proyectado: el wizard inyecta sus propios botones (p.ej. forms
            con <form>/submit/Ctrl+S o lógica alta-vs-edición). El shell solo
            aporta el layout + el contador de pasos; el contenido va a la derecha.
          -->
          <div class="ml-auto flex items-center gap-3">
            <ng-content select="[wizardFooter]" />
          </div>
        } @else {
          <!--
            flex-row-reverse: el CTA primario queda primero en DOM order (mejor
            tab navigation desde el último campo del step), pero visualmente
            termina a la derecha: Cancelar | Atrás | Continuar/Finalizar.
          -->
          <div class="ml-auto flex flex-row-reverse gap-2">
            @if (isLast()) {
              <p-button
                [label]="finishLabel()"
                type="button"
                severity="success"
                [loading]="finishLoading()"
                [disabled]="finishDisabled()"
                (onClick)="finish.emit()" />
            } @else {
              <p-button
                [label]="continueLabel()"
                type="button"
                [disabled]="continueDisabled()"
                [loading]="continueLoading()"
                (onClick)="next.emit()" />
            }
            @if (!isFirst()) {
              <p-button label="Atrás" [text]="true" type="button" (onClick)="back.emit()" />
            }
            <p-button
              [label]="cancelLabel()"
              severity="secondary"
              [outlined]="true"
              type="button"
              (onClick)="cancel.emit()" />
          </div>
        }
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .wz-bar--top { border-bottom: 1px solid var(--ds-border); }
    .wz-bar--bottom { border-top: 1px solid var(--ds-border); }
  `],
})
export class WizardShellComponent {
  /** Título de la página (h1). */
  readonly heading = input.required<string>();
  /** Migas opcionales a la derecha del header (texto plano). */
  readonly breadcrumb = input<string>('');

  readonly steps = input.required<readonly FormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly clickable = input<boolean>(true);

  /** Ancho máximo del contenido centrado. Default 720px (estándar del DS). */
  readonly maxWidth = input<string>('720px');

  /**
   * Cuando es `true`, el footer NO renderiza los botones por defecto y en su
   * lugar proyecta el contenido marcado con `[wizardFooter]`. Úsalo en wizards
   * que envuelven el shell en un `<form>` con submit/Ctrl+S o que necesitan
   * lógica de botones propia (alta vs edición). El contador "Paso X de Y" se
   * mantiene siempre.
   */
  readonly customFooter = input<boolean>(false);

  readonly continueLabel = input<string>('Continuar');
  readonly continueDisabled = input<boolean>(false);
  readonly continueLoading = input<boolean>(false);

  readonly finishLabel = input<string>('Finalizar');
  readonly finishDisabled = input<boolean>(false);
  readonly finishLoading = input<boolean>(false);

  readonly cancelLabel = input<string>('Cancelar');

  readonly stepSelected = output<number>();
  readonly next = output<void>();
  readonly back = output<void>();
  readonly cancel = output<void>();
  readonly finish = output<void>();

  readonly isFirst = computed(() => this.currentIndex() === 0);
  readonly isLast = computed(() => this.currentIndex() === this.steps().length - 1);
}
