import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NotificationService } from '@core/services/notification.service';

/**
 * Muestra el link de primer login tras crear/regenerar un usuario. Como el alta
 * NO manda email (todavía), el admin copia este link y se lo pasa al usuario para
 * que setee su contraseña en /first-login.
 */
@Component({
  selector: 'emp-first-login-link-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="!!currentToken()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [dismissableMask]="true"
      header="Link de acceso del usuario"
      [style]="{ width: '32rem', maxWidth: '92vw' }">
      <p class="text-sm" style="margin: 0 0 var(--space-3); color: var(--ds-text-muted);">
        Pasale este link al usuario para que cree su contraseña e ingrese por primera vez.
      </p>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <input pInputText type="text" readonly [value]="link()" style="flex: 1;" />
        <p-button label="Copiar link" icon="pi pi-copy" (onClick)="copy()" />
      </div>
    </p-dialog>
  `,
})
export class FirstLoginLinkDialogComponent {
  private readonly notification = inject(NotificationService);
  private readonly _token = signal<string | null>(null);

  @Input() set token(value: string | null) { this._token.set(value ?? null); }
  @Output() close = new EventEmitter<void>();

  protected readonly currentToken = this._token.asReadonly();
  protected readonly link = computed(() => {
    const t = this._token();
    return t ? `${window.location.origin}/first-login?token=${encodeURIComponent(t)}` : '';
  });

  protected onVisibleChange(visible: boolean): void {
    if (!visible) this.close.emit();
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.notification.success('Link copiado al portapapeles.');
    } catch {
      this.notification.error('No se pudo copiar el link. Copialo manualmente.');
    }
  }
}
