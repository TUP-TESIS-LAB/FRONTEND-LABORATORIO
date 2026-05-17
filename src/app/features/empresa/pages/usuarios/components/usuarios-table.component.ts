import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuarios-table',
  standalone: true,
  imports: [TableModule, ButtonModule, TagModule, MenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-table
      [value]="usuarios"
      [lazy]="true"
      [paginator]="true"
      [rows]="size"
      [first]="page * size"
      [totalRecords]="totalElements"
      [loading]="loading"
      stripedRows
      (onPage)="onPage($event)">
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 4rem"></th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Sucursal</th>
          <th>Estado</th>
          <th style="width: 12rem; text-align: right">Acciones</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-u>
        <tr>
          <td><div class="emp-avatar">{{ initials(u) }}</div></td>
          <td>
            <div class="ui-stack">
              <strong>{{ u.firstName }} {{ u.lastName }}</strong>
              <small class="ui-text-muted">{{ u.email }}</small>
            </div>
          </td>
          <td>{{ rolesLabel(u) }}</td>
          <td>{{ u.branch ?? '—' }}</td>
          <td>
            <p-tag [value]="u.active ? 'Activo' : 'Inactivo'"
                   [severity]="u.active ? 'success' : 'warn'" />
          </td>
          <td style="text-align: right">
            <p-button icon="pi pi-pencil" severity="secondary" text rounded
                      ariaLabel="Editar" (onClick)="edit.emit(u)" />
            <p-button [icon]="u.active ? 'pi pi-ban' : 'pi pi-check'"
                      [severity]="u.active ? 'warn' : 'success'" text rounded
                      [ariaLabel]="u.active ? 'Desactivar' : 'Activar'"
                      (onClick)="toggleStatus.emit(u)" />
            <p-button icon="pi pi-ellipsis-v" severity="secondary" text rounded
                      ariaLabel="Más acciones"
                      (onClick)="moreMenu.toggle($event); active = u" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="6">
          <div class="ui-empty-state">
            <i class="pi pi-users"></i>
            <h4>Sin resultados</h4>
            <p>No hay usuarios que coincidan con los filtros.</p>
          </div>
        </td></tr>
      </ng-template>
    </p-table>

    <p-menu #moreMenu [popup]="true" [model]="moreActions()" />
  `,
  styles: [`
    .emp-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--brand-secondary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600;
    }
    .ui-stack { display: flex; flex-direction: column; }
    .ui-text-muted { color: var(--ds-text-muted); }
    .ui-empty-state { padding: var(--space-8); text-align: center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class UsuariosTableComponent {
  @Input({ required: true }) usuarios!: Usuario[];
  @Input({ required: true }) page!: number;
  @Input({ required: true }) size!: number;
  @Input({ required: true }) totalElements!: number;
  @Input() loading = false;

  @Output() edit = new EventEmitter<Usuario>();
  @Output() toggleStatus = new EventEmitter<Usuario>();
  @Output() resendInvite = new EventEmitter<Usuario>();
  @Output() regenerateToken = new EventEmitter<Usuario>();
  @Output() pageChange = new EventEmitter<{ page: number; size: number }>();

  active: Usuario | null = null;

  initials(u: Usuario): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  }
  rolesLabel(u: Usuario): string {
    return u.roles.map((r) => r.description).join(', ') || '—';
  }
  onPage(e: TablePageEvent): void {
    this.pageChange.emit({ page: Math.floor(e.first / e.rows), size: e.rows });
  }
  moreActions(): MenuItem[] {
    return [
      { label: 'Reenviar verificación', icon: 'pi pi-envelope',
        command: () => this.active && this.resendInvite.emit(this.active) },
      { label: 'Regenerar invitación', icon: 'pi pi-refresh',
        command: () => this.active && this.regenerateToken.emit(this.active) },
    ];
  }
}
