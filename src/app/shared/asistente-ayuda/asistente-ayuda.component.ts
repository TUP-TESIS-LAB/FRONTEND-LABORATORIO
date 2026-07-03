import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AsistenteAyudaService } from '@core/services/asistente-ayuda.service';

/**
 * Widget flotante de ayuda para el staff del laboratorio. Botón colapsado (con la
 * mascota "tubo de ensayo") en la esquina inferior derecha que despliega un panel
 * de chat. La conversación y su persistencia viven en {@link AsistenteAyudaService};
 * este componente es solo UI.
 *
 * Se monta una vez en el shell autenticado (`admin-shell`).
 */
@Component({
  selector: 'app-asistente-ayuda',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mascota: tubo de ensayo con carita + signo de pregunta -->
    <ng-template #mascot>
      <svg class="aa-mascot" viewBox="0 0 32 32" fill="none" aria-hidden="true"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4 v12 a4 4 0 0 0 8 0 V4" />
        <path d="M10 4 h12" />
        <path d="M12 14.5 h8" stroke-width="1.5" opacity="0.85" />
        <circle cx="14.5" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
        <path d="M14.2 19.5 q1.8 1.5 3.6 0" stroke-width="1.4" />
        <path d="M23.2 7.4 a2.2 2.2 0 1 1 2.4 2.2 c-0.9 0.4 -1.2 1 -1.2 1.9" stroke-width="1.6" />
        <circle cx="24.2" cy="13.6" r="0.7" fill="currentColor" stroke="none" />
      </svg>
    </ng-template>

    @if (!open() && !closing()) {
      <button type="button" class="aa-fab" (click)="toggle()" aria-label="Abrir asistente de ayuda">
        <img class="aa-fab__img" src="/info.png" alt="" />
      </button>
    } @else {
      <section class="aa-panel" [class.aa-panel--closing]="closing()"
               role="dialog" aria-label="Asistente de ayuda">
        <header class="aa-panel__head">
          <span class="aa-panel__brand">
            <ng-container [ngTemplateOutlet]="mascot" />
            <span class="aa-panel__title">Asistente de ayuda</span>
          </span>
          <button type="button" class="aa-close" (click)="close()" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        </header>

        <div class="aa-panel__body" #scrollBox>
          @if (messages().length === 0) {
            <p class="aa-empty">
              Preguntame cómo usar el sistema. Por ejemplo:
              "¿cómo doy de alta un paciente?".
            </p>
          }
          @for (m of messages(); track $index) {
            <div
              class="aa-msg"
              [class.aa-msg--user]="m.role === 'user'"
              [class.aa-msg--bot]="m.role === 'assistant'">
              <div class="aa-bubble">{{ m.content }}</div>
            </div>
          }
          @if (loading()) {
            <div class="aa-msg aa-msg--bot">
              <div class="aa-bubble aa-bubble--typing">Escribiendo…</div>
            </div>
          }
          @if (error()) {
            <p class="aa-error">{{ error() }}</p>
          }
        </div>

        <form class="aa-panel__foot" (submit)="$event.preventDefault(); submit()">
          <textarea
            class="aa-input"
            rows="1"
            placeholder="Escribí tu pregunta…"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
            [ngModelOptions]="{ standalone: true }"
            (keydown.enter)="onEnter($event)"
            [disabled]="loading()"></textarea>
          <button type="submit" class="aa-send" [disabled]="loading() || !draft().trim()"
                  aria-label="Enviar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 2 L11 13" />
              <path d="M22 2 L15 22 L11 13 L2 9 Z" />
            </svg>
          </button>
        </form>
      </section>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      right: var(--space-6, 1.5rem);
      bottom: var(--space-6, 1.5rem);
      z-index: 1200;
    }

    .aa-mascot { width: 100%; height: 100%; display: block; }

    .aa-fab {
      width: 92px;
      height: 92px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: transform .15s ease, filter .15s ease;
      animation: aa-fab-in .22s cubic-bezier(.34, 1.56, .64, 1) both;
    }
    .aa-fab:hover { filter: brightness(1.04); transform: translateY(-2px); }
    .aa-fab:active { transform: translateY(0); }
    .aa-fab__img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, .3));
    }

    /* Aparición/cierre naturales del panel (origen en la esquina del FAB). */
    @keyframes aa-panel-in {
      from { opacity: 0; transform: translateY(12px) scale(.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes aa-panel-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(12px) scale(.92); }
    }
    @keyframes aa-fab-in {
      from { opacity: 0; transform: scale(.6); }
      to   { opacity: 1; transform: scale(1); }
    }

    .aa-panel {
      display: flex;
      flex-direction: column;
      width: min(360px, calc(100vw - 2rem));
      height: min(480px, calc(100dvh - 2rem));
      background: var(--ds-surface, #fff);
      border: 1px solid var(--ds-border, #d0d5dd);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, .22);
      overflow: hidden;
      transform-origin: bottom right;
      animation: aa-panel-in .2s cubic-bezier(.16, 1, .3, 1) both;
    }
    .aa-panel--closing { animation: aa-panel-out .16s ease-in both; }

    @media (prefers-reduced-motion: reduce) {
      .aa-fab, .aa-panel, .aa-panel--closing { animation: none; }
    }
    .aa-panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .6rem .5rem .6rem .9rem;
      background: var(--brand-primary, #1d4ed8);
      color: var(--brand-on-primary, #fff);
    }
    .aa-panel__brand { display: flex; align-items: center; gap: .55rem; }
    .aa-panel__brand .aa-mascot { width: 24px; height: 24px; }
    .aa-panel__title { font-weight: 600; }
    .aa-close {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      padding: 6px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .aa-close:hover { background: rgba(255, 255, 255, .18); }
    .aa-close svg { width: 100%; height: 100%; }

    .aa-panel__body {
      flex: 1;
      overflow-y: auto;
      padding: .75rem;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      background: var(--ds-bg, #f7f8fa);
      scroll-behavior: auto;
    }
    .aa-empty {
      color: var(--ds-text-muted, #667085);
      font-size: .9rem;
      margin: .25rem 0;
    }
    .aa-msg { display: flex; }
    .aa-msg--user { justify-content: flex-end; }
    .aa-msg--bot { justify-content: flex-start; }
    .aa-bubble {
      max-width: 82%;
      padding: .5rem .75rem;
      border-radius: 10px;
      font-size: .9rem;
      line-height: 1.35;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .aa-msg--user .aa-bubble {
      background: var(--brand-primary, #1d4ed8);
      color: var(--brand-on-primary, #fff);
      border-bottom-right-radius: 2px;
    }
    .aa-msg--bot .aa-bubble {
      background: var(--ds-surface, #fff);
      border: 1px solid var(--ds-border, #e4e7ec);
      color: var(--ds-text, #101828);
      border-bottom-left-radius: 2px;
    }
    .aa-bubble--typing { color: var(--ds-text-muted, #667085); font-style: italic; }
    .aa-error {
      color: var(--ds-danger, #b42318);
      font-size: .85rem;
      margin: .25rem 0 0;
    }

    .aa-panel__foot {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .55rem .6rem;
      border-top: 1px solid var(--ds-border, #e4e7ec);
      background: var(--ds-surface, #fff);
    }
    .aa-input {
      flex: 1;
      resize: none;
      border: 1px solid transparent;
      border-radius: 20px;
      background: var(--ds-bg, #f0f2f5);
      padding: .55rem .9rem;
      font: inherit;
      font-size: .9rem;
      line-height: 1.3;
      max-height: 96px;
    }
    .aa-input:focus {
      outline: none;
      border-color: var(--brand-primary, #1d4ed8);
      background: var(--ds-surface, #fff);
    }
    .aa-send {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--brand-primary, #1d4ed8);
      color: var(--brand-on-primary, #fff);
      cursor: pointer;
      transition: filter .15s ease;
    }
    .aa-send:hover:not(:disabled) { filter: brightness(1.06); }
    .aa-send:disabled { opacity: .45; cursor: default; }
    .aa-send svg { width: 18px; height: 18px; }
  `],
})
export class AsistenteAyudaComponent {
  private readonly service = inject(AsistenteAyudaService);

  readonly open = signal(false);
  readonly closing = signal(false);
  readonly draft = signal('');

  /** Duración de la animación de salida del panel (ms), sincronizada con el CSS. */
  private static readonly CLOSE_ANIM_MS = 160;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly messages = this.service.messages;
  readonly loading = this.service.loading;
  readonly error = this.service.error;

  private readonly scrollBox = viewChild<ElementRef<HTMLElement>>('scrollBox');

  constructor() {
    // Mantiene el scroll anclado al fondo: al abrir el panel (cuando aparece
    // scrollBox), al llegar un mensaje nuevo y al cambiar el estado de carga.
    effect(() => {
      this.messages();
      this.loading();
      this.open();
      const box = this.scrollBox();
      if (box) {
        queueMicrotask(() => {
          const el = box.nativeElement;
          el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  toggle(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
      this.closing.set(false);
    }
    this.open.update((v) => !v);
  }

  /** Reproduce la animación de salida y recién ahí desmonta el panel. */
  close(): void {
    if (this.closing()) {
      return;
    }
    this.closing.set(true);
    this.closeTimer = setTimeout(() => {
      this.open.set(false);
      this.closing.set(false);
      this.closeTimer = null;
    }, AsistenteAyudaComponent.CLOSE_ANIM_MS);
  }

  submit(): void {
    const q = this.draft().trim();
    if (!q) {
      return;
    }
    this.service.send(q);
    this.draft.set('');
  }

  /** Enter envía; Shift+Enter inserta salto de línea. */
  onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (key.shiftKey) {
      return;
    }
    event.preventDefault();
    this.submit();
  }
}
