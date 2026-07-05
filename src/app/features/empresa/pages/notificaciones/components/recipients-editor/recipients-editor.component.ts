import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';

import { EligibleRecipients, EventConfig, Recipient } from '../../../../models/notificaciones-config.model';
import {
  applyRolesChange,
  applyUserToggle,
  deriveUserRows,
  roleCodesOf,
} from './recipients-editor.logic';

/**
 * Editor de destinatarios de un evento (fila expandida de la tab "Notificaciones").
 *
 * Modelo rol-primero, aditivo, con excepciones:
 * - Elegir un rol lo agrega como destinatario `ROLE` (aditivo: le llega a todos los que
 *   tengan el rol, incluidos los nuevos) y precarga sus usuarios tildados.
 * - Destildar un usuario que entra por rol lo agrega como `EXCLUDED_USER` (deja de recibir
 *   aunque tenga el rol). Re-tildarlo quita la exclusión.
 * - Tildar un usuario que no entra por ningún rol lo agrega como `USER` (destinatario puntual).
 *
 * Componente dumb: emite la lista completa de recipients reconstruida en cada cambio; el page
 * contenedor la persiste (`updateConfig`, auto-save).
 *
 * Nota (diferido): el endpoint `eligible` no discrimina usuarios por rol, así que "usuarios del
 * rol" = todos los elegibles cuando hay ≥1 rol agregado.
 */
@Component({
  selector: 'emp-recipients-editor',
  standalone: true,
  imports: [FormsModule, CheckboxModule, MultiSelectModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rec-editor">
      <section class="rec-zone rec-zone--roles">
        <header class="rec-zone__head">
          <i class="pi pi-users"></i>
          <span>Roles</span>
        </header>
        <p class="rec-zone__hint">
          Un rol agrega a todos sus usuarios de forma automática, incluidos los que se sumen después.
        </p>
        <p-multiSelect
          [options]="eligible()?.roles ?? []"
          optionLabel="label"
          optionValue="code"
          [ngModel]="roleCodes()"
          placeholder="Elegí uno o más roles"
          appendTo="body"
          styleClass="rec-roles__select"
          (onChange)="onRolesChange($event.value)" />
      </section>

      <section class="rec-zone rec-zone--users">
        <header class="rec-zone__head">
          <i class="pi pi-user"></i>
          <span>Usuarios</span>
        </header>
        @if (hasRole()) {
          <p class="rec-zone__hint">Destildá a quien no deba recibir, aunque tenga el rol.</p>
        } @else {
          <p class="rec-zone__hint">Elegí usuarios puntuales que deban recibir este evento.</p>
        }

        @if (userRows().length) {
          <ul class="rec-user-list">
            @for (u of userRows(); track u.id) {
              <li class="rec-user" [class.rec-user--disabled]="u.disabled">
                <p-checkbox
                  [inputId]="'rec-user-' + u.id"
                  [binary]="true"
                  [ngModel]="u.receives"
                  [disabled]="u.disabled"
                  (onChange)="toggleUser(u.id, $event.checked)" />
                <label [attr.for]="'rec-user-' + u.id" class="rec-user__name">{{ u.nombre }}</label>
                @if (u.disabled) {
                  <i
                    class="pi pi-exclamation-triangle rec-user__warn"
                    pTooltip="Este usuario no tiene acceso a la pantalla de este evento"
                    tooltipPosition="top"></i>
                }
              </li>
            }
          </ul>
        } @else {
          <p class="rec-empty">No hay usuarios elegibles para este evento.</p>
        }
      </section>
    </div>
  `,
  styles: [`
    .rec-editor {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }
    @media (max-width: 720px) { .rec-editor { grid-template-columns: 1fr; } }

    .rec-zone {
      display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-3);
      border: 1px solid transparent;
      border-radius: 10px;
      background: #fff;
    }
    .rec-zone__head {
      display: flex; align-items: center; gap: var(--space-2);
      font-weight: 700; font-size: 13px; letter-spacing: 0.02em;
    }
    .rec-zone__hint { font-size: 12px; color: #6b7280; margin: 0; }

    /* Zona Roles — violeta */
    .rec-zone--roles { border-color: #ddd6fe; background: #faf8ff; }
    .rec-zone--roles .rec-zone__head { color: #6d28d9; }
    .rec-zone--roles .rec-zone__head i { color: #6d28d9; }

    /* Zona Usuarios — azul */
    .rec-zone--users { border-color: #bfdbfe; background: #f7fafe; }
    .rec-zone--users .rec-zone__head { color: #1d4ed8; }
    .rec-zone--users .rec-zone__head i { color: #1d4ed8; }

    .rec-user-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .rec-user {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 5px 6px; border-radius: 7px;
    }
    .rec-user:hover { background: #eef4ff; }
    .rec-user--disabled { opacity: 0.7; }
    .rec-user__name { font-size: 13px; color: var(--ds-text); cursor: pointer; }
    .rec-user--disabled .rec-user__name { cursor: not-allowed; }
    .rec-user__warn { color: var(--ds-warning, #c2410c); font-size: 13px; }
    .rec-empty { font-size: 12px; color: #6b7280; margin: 0; }
  `],
})
export class RecipientsEditorComponent {
  readonly config = input.required<EventConfig>();
  readonly eligible = input<EligibleRecipients | undefined>(undefined);

  /** Lista completa de recipients reconstruida (ROLE + USER + EXCLUDED_USER) tras cada cambio. */
  readonly recipientsChange = output<Recipient[]>();

  protected readonly roleCodes = computed<string[]>(() => roleCodesOf(this.config().recipients));

  protected readonly hasRole = computed<boolean>(() => this.roleCodes().length > 0);

  protected readonly userRows = computed(() =>
    deriveUserRows(this.config().recipients, this.eligible()?.users ?? []));

  protected onRolesChange(codes: string[]): void {
    this.recipientsChange.emit(applyRolesChange(this.config().recipients, codes));
  }

  protected toggleUser(id: number, checked: boolean): void {
    this.recipientsChange.emit(applyUserToggle(this.config().recipients, id, checked));
  }
}
