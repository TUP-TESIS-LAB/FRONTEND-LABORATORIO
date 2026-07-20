import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-printer-token-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog [visible]="!!currentToken()" (visibleChange)="onVisibleChange($event)" [modal]="true"
              [dismissableMask]="false" [closable]="true" header="Token de la impresora"
              [style]="{ width: '34rem', maxWidth: '92vw' }">
      <p>Copiá este token ahora. <strong>No se vuelve a mostrar.</strong> El agente de impresión lo usa para autenticarse.</p>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <input pInputText type="text" readonly [value]="currentToken() ?? ''" style="flex: 1;" />
        <p-button label="Copiar" icon="pi pi-copy" (onClick)="copy()" />
      </div>
    </p-dialog>`,
})
export class PrinterTokenDialogComponent {
  private readonly messages = inject(MessageService);
  private readonly _token = signal<string | null>(null);
  @Input() set token(value: string | null) { this._token.set(value ?? null); }
  @Output() close = new EventEmitter<void>();
  protected readonly currentToken = this._token.asReadonly();

  protected async copy(): Promise<void> {
    const t = this.currentToken();
    if (!t) return;
    await navigator.clipboard.writeText(t);
    this.messages.add({ severity: 'info', summary: 'Copiado', detail: 'Token copiado al portapapeles.' });
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) this.close.emit();
  }
}
