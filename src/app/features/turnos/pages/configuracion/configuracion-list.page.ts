import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadAgendas, deleteAgenda } from '../../store/agendas/agendas.actions';
import {
  selectAgendasPending,
  selectAllConfigsByBranch,
  selectAgendasError,
} from '../../store/agendas/agendas.selectors';
import { AgendaBranchSectionComponent } from '../../components/agenda-branch-section.component';

@Component({
  selector: 'app-configuracion-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    AccordionModule,
    SelectModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    SkeletonModule,
    AgendaBranchSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-list.page.html',
  styleUrl: './configuracion-list.page.scss',
  providers: [ConfirmationService, MessageService],
})
export class ConfiguracionListPage implements OnInit {
  private store = inject(Store);
  protected router = inject(Router);
  private confirm = inject(ConfirmationService);
  private session = inject(UserSessionService);

  protected pending = this.store.selectSignal(selectAgendasPending);
  protected error = this.store.selectSignal(selectAgendasError);
  protected configsByBranch = this.store.selectSignal(selectAllConfigsByBranch);

  // Señales para filtros — usadas con getter/setter para compatibilidad con ngModel
  private _filterBranchId = signal<number | null>(null);
  private _searchTerm = signal<string>('');

  get filterBranchId(): number | null { return this._filterBranchId(); }
  set filterBranchId(v: number | null) { this._filterBranchId.set(v); }

  get searchTerm(): string { return this._searchTerm(); }
  set searchTerm(v: string) { this._searchTerm.set(v); }

  // Pendiente: cuando exista store de sucursales accesibles, reemplazar esta derivación.
  protected branches = computed(() => {
    const map = this.configsByBranch();
    return Object.keys(map).map(id => ({ id: Number(id), name: `Sucursal ${id}` }));
  });

  protected visibleBranches = computed(() => {
    const filter = this._filterBranchId();
    return filter == null ? this.branches() : this.branches().filter(b => b.id === filter);
  });

  protected canWrite = computed(() => {
    const roles = this.session.currentUser()?.roles?.map(r => r.code) ?? [];
    return roles.includes('ADMINISTRADOR') || roles.includes('RESPONSABLE_SECRETARIA');
  });

  ngOnInit(): void {
    const branch = this.session.currentUser()?.branch;
    if (branch != null) {
      this.store.dispatch(loadAgendas({ branchId: branch }));
      this._filterBranchId.set(branch);
    } else {
      // Pendiente: iterar sobre branches visibles del usuario cuando exista el store de sucursales.
      this.store.dispatch(loadAgendas({ branchId: 1 }));
    }
  }

  protected onAgregarPara(branchId: number): void {
    this.router.navigate(['/turnos/configuracion/nueva'], { queryParams: { branchId } });
  }

  protected onEditar(id: number): void {
    this.router.navigate(['/turnos/configuracion', id, 'editar']);
  }

  protected onEliminar(id: number, branchId: number): void {
    this.confirm.confirm({
      header: 'Eliminar agenda',
      message:
        'Los turnos ya reservados con esta agenda no se afectarán. ¿Confirmás eliminar la configuración?',
      acceptLabel: 'Eliminar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deleteAgenda({ id, branchId })),
    });
  }
}
