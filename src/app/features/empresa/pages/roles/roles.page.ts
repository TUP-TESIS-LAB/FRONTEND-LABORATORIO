import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { Message } from 'primeng/message';

import { loadRoles } from '../../store/empresa.actions';
import {
  selectAllRoles,
  selectEmpresaPending,
  selectEmpresaError,
} from '../../store/empresa.selectors';

@Component({
  selector: 'emp-roles-page',
  standalone: true,
  imports: [TableModule, SkeletonModule, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-message
      severity="info"
      text="Los roles los gestiona el administrador de la plataforma. Para asignarlos a un usuario, andá a la pestaña Usuarios."
      class="ui-mb-3" />

    @if (pending() && roles().length === 0) {
      <p-skeleton width="100%" height="2rem" />
      <p-skeleton width="100%" height="2rem" styleClass="ui-mt-2" />
      <p-skeleton width="100%" height="2rem" styleClass="ui-mt-2" />
    } @else {
      <p-table [value]="roles()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th style="width: 8rem">Jerarquía</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{ r.code }}</td>
            <td>{{ r.description }}</td>
            <td>{{ r.hierarchy }}</td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
})
export class RolesPage implements OnInit {
  private readonly store = inject(Store);

  readonly roles = this.store.selectSignal(selectAllRoles);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly error = this.store.selectSignal(selectEmpresaError);

  ngOnInit(): void {
    this.store.dispatch(loadRoles());
  }
}
