import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { PopoverModule } from 'primeng/popover';
import { ExtractorBoxService } from '@core/services/extractor-box.service';

/**
 * FAB flotante (bottom-right) para configurar y ver el box actual del extractor.
 *
 * - Sin box configurado → botón "Configurar box" en color secundario.
 * - Con box → muestra "Box N" en color primario.
 * - Al hacer click abre un popover con un input numérico para cambiarlo.
 *
 * Comparte estado con el drawer "Tomar paciente" vía ExtractorBoxService.
 */
@Component({
  selector: 'app-extractor-box-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, PopoverModule],
  template: `
    <button
      type="button"
      class="box-fab"
      [class.box-fab--unset]="!current()"
      [attr.aria-label]="current() ? 'Cambiar box (actual: ' + current() + ')' : 'Configurar box'"
      (click)="op.toggle($event)"
    >
      <i class="pi" [class.pi-th-large]="!!current()" [class.pi-cog]="!current()"></i>
      <span class="box-fab__label">
        {{ current() ? 'Box ' + current() : 'Configurar box' }}
      </span>
    </button>

    <p-popover #op styleClass="box-fab__popover" appendTo="body">
      <div class="popover-body">
        <header class="popover-header">
          <i class="pi pi-th-large"></i>
          <span>Box de trabajo</span>
        </header>
        <p class="popover-hint">
          Indicá el número de box donde estás atendiendo. Se va a usar la próxima vez que
          tomes un paciente y queda guardado en este navegador.
        </p>
        <label class="popover-field">
          <span>Número de box</span>
          <p-inputNumber
            [(ngModel)]="draft"
            [min]="1"
            [max]="999"
            [showButtons]="true"
            [useGrouping]="false"
            inputId="box-fab-input"
            placeholder="Ej: 3"
            autofocus
          />
        </label>
        <footer class="popover-footer">
          @if (current()) {
            <p-button
              label="Quitar"
              severity="secondary"
              [text]="true"
              size="small"
              (onClick)="onClear(op)"
            />
          }
          <p-button
            label="Guardar"
            icon="pi pi-check"
            size="small"
            [disabled]="!canSave()"
            (onClick)="onSave(op)"
          />
        </footer>
      </div>
    </p-popover>
  `,
  styles: [`
    :host { display: contents; }

    .box-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9990;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 999px;
      border: 1px solid transparent;
      background: var(--brand-primary, #0f766e);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.2);
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .box-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
    .box-fab:active { transform: translateY(0); }
    .box-fab i { font-size: 16px; }
    .box-fab__label { letter-spacing: 0.2px; }

    .box-fab--unset {
      background: #fff;
      color: #475569;
      border-color: #cbd5e1;
    }
    .box-fab--unset:hover { background: #f8fafc; }

    .popover-body { display: flex; flex-direction: column; gap: 12px; padding: 4px 4px; min-width: 280px; }
    .popover-header { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
    .popover-hint { font-size: 12px; color: #64748b; line-height: 1.4; margin: 0; }
    .popover-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 500; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class ExtractorBoxFabComponent {
  private readonly boxService = inject(ExtractorBoxService);

  readonly current = this.boxService.box;
  readonly draft = signal<number | null>(this.current());
  readonly canSave = computed(() => {
    const v = this.draft();
    return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v !== this.current();
  });

  onSave(op: { hide: () => void }): void {
    const v = this.draft();
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return;
    this.boxService.setBox(v);
    op.hide();
  }

  onClear(op: { hide: () => void }): void {
    this.boxService.clear();
    this.draft.set(null);
    op.hide();
  }
}
