import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { EligibleRecipients, EligibleUser, EventConfig, Recipient } from '../../../../models/notificaciones-config.model';
import {
  AssignedUser,
  applyRolesChange,
  applyUserToggle,
  deriveUserRows,
  excludedRefsOf,
  filterUsers,
  resolveAssigned,
  roleCodesOf,
} from './recipients-editor.logic';

/** Cantidad de chips de asignados visibles antes de plegar el resto en "Otros". */
const FIRST_ROW = 8;

/**
 * Editor de destinatarios de un evento (fila expandida de la tab "Notificaciones").
 *
 * Layout (KAN-198): dos cards arriba + un bloque abajo.
 * - **Card A (Rol y sucursal):** el multiselect de roles agrega destinatarios `ROLE` (aditivo);
 *   el select de sucursal es un filtro visual de la card B (no toca recipients).
 * - **Card B (Usuarios):** buscador + lista scrolleable filtrada por rol ∩ / sucursal / búsqueda;
 *   destildar un usuario que entra por rol lo agrega como `EXCLUDED_USER`, tildar uno sin rol como `USER`.
 * - **Bloque inferior (Asignados + resumen):** resuelve reactivamente quién recibe ahora
 *   (rol − exclusiones + puntuales) y lo muestra como chips con × para quitar; se pliega en "Otros".
 *
 * Componente dumb: emite la lista completa de recipients reconstruida en cada cambio; el page
 * contenedor la persiste (`updateConfig`, auto-save). Modelo aditivo con excepciones de KAN-185.
 */
@Component({
  selector: 'emp-recipients-editor',
  standalone: true,
  imports: [FormsModule, CheckboxModule, MultiSelectModule, SelectModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rec-editor">
      <div class="rec-cards">
        <!-- Card A — Rol y sucursal -->
        <section class="rec-zone rec-zone--roles">
          <header class="rec-zone__head">
            <i class="pi pi-users"></i>
            <span>Rol y sucursal</span>
          </header>
          <p class="rec-zone__hint">
            Un rol agrega a todos sus usuarios de forma automática, incluidos los que se sumen después.
            La sucursal sólo filtra la lista.
          </p>

          <label class="rec-field__label" for="rec-roles">Roles</label>
          <p-multiSelect
            inputId="rec-roles"
            [options]="eligible()?.roles ?? []"
            optionLabel="label"
            optionValue="code"
            [ngModel]="roleCodes()"
            placeholder="Elegí uno o más roles"
            appendTo="body"
            styleClass="rec-roles__select"
            (onChange)="onRolesChange($event.value)" />

          <label class="rec-field__label" for="rec-branch">Sucursal</label>
          <p-select
            inputId="rec-branch"
            [options]="branchOptions()"
            optionLabel="name"
            optionValue="id"
            [ngModel]="branchFilter()"
            appendTo="body"
            styleClass="rec-branch__select"
            (onChange)="branchFilter.set($event.value)" />
        </section>

        <!-- Card B — Usuarios -->
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

          <span class="rec-search">
            <i class="pi pi-search"></i>
            <input
              type="text"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
              placeholder="Buscar por nombre" />
          </span>

          @if (filterLabel()) {
            <span class="rec-filter-chip">
              <i class="pi pi-filter"></i>
              {{ filterLabel() }}
            </span>
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
            <p class="rec-empty">No hay usuarios que coincidan con los filtros.</p>
          }
        </section>
      </div>

      <!-- Bloque inferior — Asignados + resumen -->
      <section class="rec-assigned">
        <header class="rec-assigned__head">
          <span class="rec-assigned__count">
            {{ assigned().length }} {{ assigned().length === 1 ? 'recibe' : 'reciben' }}
          </span>
          <span class="rec-assigned__breakdown">{{ resumen() }}</span>
        </header>

        @if (assigned().length) {
          <div class="rec-chips">
            @for (a of assignedVisible(); track a.id) {
              <span class="rec-chip" [class.rec-chip--puntual]="!a.viaRole">
                <span class="rec-chip__name">{{ a.nombre }}</span>
                @if (!a.viaRole) {
                  <span class="rec-chip__tag">· puntual</span>
                }
                <button
                  type="button"
                  class="rec-chip__x"
                  (click)="removeAssigned(a)"
                  [attr.aria-label]="'Quitar a ' + a.nombre">
                  <i class="pi pi-times"></i>
                </button>
              </span>
            }
            @if (assigned().length > FIRST_ROW) {
              <button type="button" class="rec-chip rec-chip--more" (click)="otrosOpen.set(!otrosOpen())">
                @if (otrosOpen()) {
                  <span>menos</span>
                  <i class="pi pi-chevron-up"></i>
                } @else {
                  <span>+{{ assigned().length - FIRST_ROW }} otros</span>
                  <i class="pi pi-chevron-down"></i>
                }
              </button>
            }
          </div>
        } @else {
          <p class="rec-empty">Todavía no hay usuarios asignados. Agregá un rol o tildá usuarios puntuales.</p>
        }
      </section>
    </div>
  `,
  styles: [`
    .rec-editor { display: flex; flex-direction: column; gap: var(--space-4); }

    .rec-cards {
      display: grid;
      grid-template-columns: minmax(280px, 340px) 1fr;
      gap: var(--space-4);
    }
    @media (max-width: 720px) { .rec-cards { grid-template-columns: 1fr; } }

    .rec-zone {
      display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-3);
      border: 1px solid transparent;
      border-radius: 10px;
      background: #fff;
      min-width: 0;
    }
    .rec-zone__head {
      display: flex; align-items: center; gap: var(--space-2);
      font-weight: 700; font-size: 13px; letter-spacing: 0.02em;
    }
    .rec-zone__hint { font-size: 12px; color: #6b7280; margin: 0; }
    .rec-field__label {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      color: #6b7280; margin-top: var(--space-1);
    }

    /* Zona Roles — violeta */
    .rec-zone--roles { border-color: #ddd6fe; background: #faf8ff; }
    .rec-zone--roles .rec-zone__head,
    .rec-zone--roles .rec-zone__head i { color: #6d28d9; }

    /* Zona Usuarios — azul */
    .rec-zone--users { border-color: #bfdbfe; background: #f7fafe; }
    .rec-zone--users .rec-zone__head,
    .rec-zone--users .rec-zone__head i { color: #1d4ed8; }

    .rec-search {
      position: relative; display: inline-flex; align-items: center;
    }
    .rec-search i {
      position: absolute; left: 10px; color: #94a3b8; font-size: 13px; pointer-events: none;
    }
    .rec-search input {
      width: 100%; padding: 8px 12px 8px 30px;
      border: 1px solid #d5dde7; border-radius: 8px; font-size: 13px; background: #fff;
    }
    .rec-search input:focus { outline: none; border-color: #93b4f5; }

    .rec-filter-chip {
      display: inline-flex; align-items: center; gap: 4px; align-self: flex-start;
      padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
      background: #eef4ff; color: #1d4ed8;
    }
    .rec-filter-chip i { font-size: 11px; }

    .rec-user-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 2px;
      max-height: 240px; overflow-y: auto; overscroll-behavior: contain;
    }
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

    /* Bloque inferior — asignados + resumen */
    .rec-assigned {
      display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-3);
      border: 1px solid #d1fae5;
      border-radius: 10px;
      background: #f6fdfa;
    }
    .rec-assigned__head {
      display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap;
    }
    .rec-assigned__count { font-weight: 700; font-size: 15px; color: #047857; }
    .rec-assigned__breakdown { font-size: 12px; color: #6b7280; }

    .rec-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .rec-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 6px 3px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600;
      background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;
    }
    .rec-chip--puntual { background: #eef4ff; color: #1d4ed8; border-color: #bfdbfe; }
    .rec-chip__tag { font-weight: 500; opacity: 0.8; }
    .rec-chip__x {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border: none; border-radius: 999px;
      background: transparent; color: inherit; cursor: pointer; padding: 0;
    }
    .rec-chip__x:hover { background: rgba(0, 0, 0, 0.08); }
    .rec-chip__x i { font-size: 10px; }
    .rec-chip--more {
      padding: 3px 10px; cursor: pointer;
      background: #fff; color: #475569; border-color: #d5dde7;
    }
    .rec-chip--more:hover { background: #f1f5f9; }
    .rec-chip--more i { font-size: 11px; }
  `],
})
export class RecipientsEditorComponent {
  protected readonly FIRST_ROW = FIRST_ROW;

  readonly config = input.required<EventConfig>();
  readonly eligible = input<EligibleRecipients | undefined>(undefined);

  /** Lista completa de recipients reconstruida (ROLE + USER + EXCLUDED_USER) tras cada cambio. */
  readonly recipientsChange = output<Recipient[]>();

  // ── Filtros locales de UI (navegación, no van al store) ──
  protected readonly search = signal('');
  protected readonly branchFilter = signal<number | null>(null);
  protected readonly otrosOpen = signal(false);

  protected readonly roleCodes = computed<string[]>(() => roleCodesOf(this.config().recipients));
  protected readonly hasRole = computed<boolean>(() => this.roleCodes().length > 0);

  private readonly allUsers = computed<EligibleUser[]>(() => this.eligible()?.users ?? []);
  private readonly usersById = computed(() => new Map(this.allUsers().map((u) => [u.id, u])));

  protected readonly branchOptions = computed(() => [
    { id: null as number | null, name: 'Todas las sucursales' },
    ...(this.eligible()?.branches ?? []),
  ]);

  /** Usuarios visibles en la card B tras aplicar rol ∩ / sucursal / búsqueda. */
  protected readonly visibleUsers = computed<EligibleUser[]>(() =>
    filterUsers(this.allUsers(), {
      roleCodes: this.roleCodes(),
      branchId: this.branchFilter(),
      search: this.search(),
    }));

  protected readonly userRows = computed(() =>
    deriveUserRows(this.config().recipients, this.visibleUsers()));

  /** Set resuelto de quiénes reciben ahora (reactivo a config + eligible). */
  protected readonly assigned = computed<AssignedUser[]>(() =>
    resolveAssigned(this.config().recipients, this.allUsers()));

  protected readonly assignedVisible = computed<AssignedUser[]>(() =>
    this.otrosOpen() ? this.assigned() : this.assigned().slice(0, FIRST_ROW));

  protected readonly resumen = computed<string>(() => {
    const viaRole = this.assigned().filter((a) => a.viaRole).length;
    const puntuales = this.assigned().filter((a) => !a.viaRole).length;
    const excepciones = excludedRefsOf(this.config().recipients).length;
    const parts: string[] = [];
    if (viaRole) parts.push(`${viaRole} por rol`);
    if (puntuales) parts.push(`${puntuales} ${puntuales === 1 ? 'puntual' : 'puntuales'}`);
    if (excepciones) parts.push(`${excepciones} ${excepciones === 1 ? 'excepción' : 'excepciones'}`);
    return parts.length ? parts.join(' · ') : 'Los nuevos usuarios con el rol reciben solos.';
  });

  /** Etiqueta del chip "filtrado por…" de la card B (sólo sucursal; el rol ya se ve en la card A). */
  protected readonly filterLabel = computed<string>(() => {
    const id = this.branchFilter();
    if (id == null) return '';
    const branch = (this.eligible()?.branches ?? []).find((b) => b.id === id);
    return branch ? `Sucursal: ${branch.name}` : '';
  });

  protected onRolesChange(codes: string[]): void {
    this.recipientsChange.emit(applyRolesChange(this.config().recipients, codes));
  }

  protected toggleUser(id: number, checked: boolean): void {
    const user = this.usersById().get(id);
    if (!user) return;
    this.recipientsChange.emit(applyUserToggle(this.config().recipients, user, checked));
  }

  protected removeAssigned(a: AssignedUser): void {
    const user = this.usersById().get(a.id);
    if (!user) return;
    this.recipientsChange.emit(applyUserToggle(this.config().recipients, user, false));
  }
}
