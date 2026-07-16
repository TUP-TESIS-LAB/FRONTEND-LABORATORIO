import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { Rol } from '../../../models/rol.model';
import { BuscarUsuariosParams } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuarios-filtros',
  standalone: true,
  imports: [FormsModule, InputTextModule, IconFieldModule, InputIconModule, MultiSelectModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-filtros">
      <p-iconField iconPosition="left" class="w-full">
        <p-inputIcon><i class="pi pi-search"></i></p-inputIcon>
        <input pInputText
          class="w-full"
          placeholder="Buscar por nombre, email, documento..."
          [ngModel]="filters.search"
          (ngModelChange)="patch.emit({ search: $event || undefined, page: 0 })" />
      </p-iconField>

      <p-multiSelect
        [options]="roles" optionLabel="description" optionValue="id"
        placeholder="Filtrar por rol"
        appendTo="body"
        class="w-full"
        [ngModel]="filters.roleIds"
        (ngModelChange)="patch.emit({ roleIds: $event?.length ? $event : undefined, page: 0 })" />

      <p-select
        [options]="estados" optionLabel="label" optionValue="value"
        placeholder="Estado"
        appendTo="body"
        class="w-full"
        [ngModel]="filters.isActive"
        (ngModelChange)="patch.emit({ isActive: $event, page: 0 })" />
    </div>
  `,
  styles: [`
    .emp-filtros {
      display: grid; grid-template-columns: 1fr 220px 160px;
      gap: var(--space-3); margin-bottom: var(--space-4);
    }
    @media (max-width: 768px) { .emp-filtros { grid-template-columns: 1fr; } }
  `],
})
export class UsuariosFiltrosComponent {
  @Input({ required: true }) filters!: BuscarUsuariosParams;
  @Input({ required: true }) roles!: Rol[];
  @Output() patch = new EventEmitter<Partial<BuscarUsuariosParams>>();

  readonly estados = [
    { label: 'Todos', value: undefined },
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false },
  ];
}
