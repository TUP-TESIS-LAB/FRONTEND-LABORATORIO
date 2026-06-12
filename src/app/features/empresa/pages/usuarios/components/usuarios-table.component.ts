import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuarios-table',
  standalone: true,
  imports: [TagModule, DataTableComponent, UiCellDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-table
      [value]="usuarios"
      [loading]="loading"
      [columns]="columns"
      [lazy]="true"
      [paginator]="true"
      [rows]="size"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      [entityLabel]="'usuarios'"
      [totalRecords]="totalElements"
      [first]="page * size"
      [showEdit]="true"
      [actions]="rowActions"
      emptyHeading="Sin resultados"
      emptyIcon="pi-users"
      emptyDescription="No hay usuarios que coincidan con los filtros."
      (lazyLoad)="onLazyLoad($event)"
      (edit)="edit.emit($any($event))"
      (action)="onAction($event)">

      <ng-template uiCell="avatar" let-row>
        <div class="emp-avatar">{{ initials($any(row)) }}</div>
      </ng-template>

      <ng-template uiCell="usuario" let-row>
        <div class="ui-stack">
          <strong>{{ $any(row).firstName }} {{ $any(row).lastName }}</strong>
          <small class="ui-text-muted">{{ $any(row).email }}</small>
        </div>
      </ng-template>

      <ng-template uiCell="rol" let-row>
        {{ rolesLabel($any(row)) }}
      </ng-template>

      <ng-template uiCell="branch" let-row>
        {{ $any(row).branch ?? '—' }}
      </ng-template>

      <ng-template uiCell="estado" let-row>
        <p-tag [value]="$any(row).active ? 'Activo' : 'Inactivo'"
               [severity]="$any(row).active ? 'success' : 'warn'" />
      </ng-template>
    </ui-table>
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

  readonly columns: readonly TableColumn[] = [
    { field: 'avatar',  header: '' },
    { field: 'usuario', header: 'Usuario' },
    { field: 'rol',     header: 'Rol' },
    { field: 'branch',  header: 'Sucursal' },
    { field: 'estado',  header: 'Estado' },
  ];

  readonly rowActions: readonly TableAction[] = [
    {
      key: 'toggle',
      icon: (row) => (row as Usuario).active ? 'pi-ban' : 'pi-check',
      label: (row) => (row as Usuario).active ? 'Desactivar' : 'Activar',
      severity: (row) => (row as Usuario).active ? 'warn' : 'success',
    },
    {
      key: 'more',
      icon: 'pi-ellipsis-v',
      label: 'Más acciones',
      type: 'menu',
      menuItems: (row) => {
        const u = row as Usuario;
        return [
          {
            label: 'Reenviar verificación',
            icon: 'pi pi-envelope',
            command: () => this.resendInvite.emit(u),
          },
          {
            label: 'Regenerar invitación',
            icon: 'pi pi-refresh',
            command: () => this.regenerateToken.emit(u),
          },
        ];
      },
    },
  ];

  private firstLoad = true;

  initials(u: Usuario): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  }

  rolesLabel(u: Usuario): string {
    return u.roles.map((r) => r.description).join(', ') || '—';
  }

  onLazyLoad(e: TableLazyLoadEvent): void {
    // Ignora el primer disparo (init): el padre ya carga datos en ngOnInit.
    if (this.firstLoad) { this.firstLoad = false; return; }
    const rows = e.rows ?? this.size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.pageChange.emit({ page, size: rows });
  }

  onAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'toggle') this.toggleStatus.emit(ev.row as Usuario);
    // 'more' lo manejan los menuItems directamente via command()
  }
}
