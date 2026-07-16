import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-totem-numpad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="numpad">
      @for (d of digits; track d) {
        <button class="num-btn" type="button" [attr.data-digit]="d" (click)="pressDigit(d)">{{ d }}</button>
      }
      <button class="action-btn clear" type="button" data-action="clear" (click)="pressClear()" aria-label="Borrar">
        <i class="pi pi-backspace"></i>
        <span class="action-label">Borrar</span>
      </button>
      <button class="num-btn" type="button" data-digit="0" (click)="press0()">0</button>
      <button class="action-btn submit" type="button" data-action="submit" (click)="pressSubmit()" [disabled]="submitDisabled" aria-label="Continuar">
        <i class="pi pi-arrow-right"></i>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .numpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      width: 24rem;
      max-width: 100%;
      margin: 0 auto;
    }

    .num-btn, .action-btn {
      min-height: 5rem;
      font-size: 2.25rem;
      font-weight: 400;
      background: #ffffff;
      border: 2px solid #d1d5db;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.05s, background 0.15s;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    .action-btn.clear i { font-size: 1.5rem; }

    .action-label {
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .num-btn:active, .action-btn:active {
      transform: scale(0.97);
      background: #f3f4f6;
    }

    .action-btn.submit {
      background: var(--brand-primary);
      color: var(--p-primary-contrast-color);
      border-color: var(--brand-primary);
    }

    .action-btn.submit i { font-size: 2.25rem; }

    .action-btn.submit:active {
      background: var(--brand-primary);
    }

    .action-btn.submit:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      border-color: #d1d5db;
      cursor: not-allowed;
    }

    .action-btn.clear {
      background: #e5e7eb;
    }
  `],
})
export class TotemNumpadComponent {
  @Input() submitDisabled = false;
  @Output() digitPressed = new EventEmitter<number>();
  @Output() clearPressed = new EventEmitter<void>();
  @Output() submitPressed = new EventEmitter<void>();

  protected readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  pressDigit(d: number) { this.digitPressed.emit(d); }
  press0() { this.digitPressed.emit(0); }
  pressClear() { this.clearPressed.emit(); }
  pressSubmit() { if (!this.submitDisabled) this.submitPressed.emit(); }
}
