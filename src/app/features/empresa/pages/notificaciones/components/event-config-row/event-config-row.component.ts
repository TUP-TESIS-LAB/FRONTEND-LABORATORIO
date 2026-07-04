import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { EligibleRecipients, EventConfig, Recipient } from '../../../../models/notificaciones-config.model';

interface UserOption {
  id: number;
  nombre: string;
  /** true si el usuario no tiene acceso a la pantalla asociada al evento — se bloquea la opción. */
  disabled: boolean;
}

/**
 * Fila de la tab "Notificaciones" de Empresa: un evento con su toggle de habilitado
 * y sus destinatarios (usuarios + roles). Componente dumb — el store lo maneja el
 * page contenedor (`NotificacionesConfigPage`), que le pasa `eligible` ya resuelto
 * y escucha `(update)`/`(pickerOpen)`.
 */
@Component({
  selector: 'emp-event-config-row',
  standalone: true,
  imports: [FormsModule, ToggleSwitch, MultiSelectModule, TagModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-event-row">
      <div class="emp-event-row__head">
        <p-toggleswitch
          [ngModel]="config().enabled"
          [disabled]="!config().hasTrigger"
          (onChange)="onToggle($event.checked)" />
        <div class="emp-event-row__title">
          <strong>{{ config().title }}</strong>
          @if (!config().hasTrigger) {
            <p-tag value="Próximamente" severity="secondary" />
          }
        </div>
      </div>

      <div class="emp-event-row__recipients">
        <p-multiSelect
          [options]="userOptions()"
          optionLabel="nombre"
          optionValue="id"
          optionDisabled="disabled"
          [ngModel]="selectedUserIds()"
          placeholder="Usuarios"
          appendTo="body"
          [disabled]="!config().hasTrigger"
          styleClass="emp-event-row__picker"
          (onPanelShow)="onPickerShow()"
          (onChange)="onUsersChange($event.value)">
          <ng-template pTemplate="item" let-item>
            <div class="emp-event-row__option">
              <span>{{ item.nombre }}</span>
              @if (item.disabled) {
                <i
                  class="pi pi-exclamation-triangle emp-event-row__warning-icon"
                  pTooltip="Este usuario no tiene acceso a la pantalla de este evento"
                  tooltipPosition="top"></i>
              }
            </div>
          </ng-template>
        </p-multiSelect>

        <p-multiSelect
          [options]="eligible()?.roles ?? []"
          optionLabel="label"
          optionValue="code"
          [ngModel]="selectedRoleCodes()"
          placeholder="Roles"
          appendTo="body"
          [disabled]="!config().hasTrigger"
          styleClass="emp-event-row__picker"
          (onPanelShow)="onPickerShow()"
          (onChange)="onRolesChange($event.value)" />
      </div>
    </div>
  `,
  styles: [`
    .emp-event-row {
      display: flex; flex-direction: column; gap: var(--space-3);
      padding: var(--space-4);
      background: var(--ds-surface); border-radius: 8px;
    }
    .emp-event-row__head { display: flex; align-items: center; gap: var(--space-3); }
    .emp-event-row__title { display: flex; align-items: center; gap: var(--space-2); }
    .emp-event-row__title strong { color: var(--ds-text); }
    .emp-event-row__recipients {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
    }
    @media (max-width: 640px) { .emp-event-row__recipients { grid-template-columns: 1fr; } }
    .emp-event-row__option { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); width: 100%; }
    .emp-event-row__warning-icon { color: var(--ds-warning); }
  `],
})
export class EventConfigRowComponent {
  readonly config = input.required<EventConfig>();
  readonly eligible = input<EligibleRecipients | undefined>(undefined);

  readonly update = output<{ eventType: string; enabled: boolean; recipients: Recipient[] }>();
  /** Se emite cuando se abre cualquiera de los dos pickers, para que el page cargue eligible on-demand. */
  readonly pickerOpen = output<void>();

  protected readonly userOptions = computed<UserOption[]>(() =>
    (this.eligible()?.users ?? []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      disabled: !u.tieneAcceso,
    })));

  protected readonly selectedUserIds = computed<number[]>(() =>
    this.config().recipients.filter((r) => r.type === 'USER').map((r) => Number(r.ref)));

  protected readonly selectedRoleCodes = computed<string[]>(() =>
    this.config().recipients.filter((r) => r.type === 'ROLE').map((r) => r.ref));

  protected onToggle(enabled: boolean): void {
    this.emitUpdate(enabled, this.config().recipients);
  }

  protected onUsersChange(ids: number[]): void {
    const roleRecipients = this.config().recipients.filter((r) => r.type === 'ROLE');
    const userRecipients: Recipient[] = ids.map((id) => ({ type: 'USER', ref: String(id) }));
    this.emitUpdate(this.config().enabled, [...userRecipients, ...roleRecipients]);
  }

  protected onRolesChange(codes: string[]): void {
    const userRecipients = this.config().recipients.filter((r) => r.type === 'USER');
    const roleRecipients: Recipient[] = codes.map((code) => ({ type: 'ROLE', ref: code }));
    this.emitUpdate(this.config().enabled, [...userRecipients, ...roleRecipients]);
  }

  protected onPickerShow(): void {
    this.pickerOpen.emit();
  }

  private emitUpdate(enabled: boolean, recipients: Recipient[]): void {
    this.update.emit({ eventType: this.config().eventType, enabled, recipients });
  }
}
