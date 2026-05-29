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
      </button>
      <button class="num-btn" type="button" data-digit="0" (click)="press0()">0</button>
      <button class="action-btn submit" type="button" data-action="submit" (click)="pressSubmit()" [disabled]="submitDisabled" aria-label="Enviar">
        <i class="pi pi-arrow-right"></i>
      </button>
    </div>
  `,
  styles: [`
    .numpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      max-width: 28rem;
      margin: 0 auto;
    }

    .num-btn, .action-btn {
      min-height: 5rem;
      font-size: 2.5rem;
      font-weight: 700;
      background: #ffffff;
      border: 2px solid #d1d5db;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.05s, background 0.15s;
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

    .action-btn.submit:disabled {
      background: #e5e7eb;
      color: #9ca3af;
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
