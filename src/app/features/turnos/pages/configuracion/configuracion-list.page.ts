import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { SucursalesService } from '../../../sucursales/services/sucursales.service';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly sucursalesService = inject(SucursalesService);

  private readonly branchesFromService = signal<{ id: number; name: string }[]>([]);

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

  protected branches = computed(() => {
    const fromService = this.branchesFromService();
    if (fromService.length > 0) return fromService;
    // Fallback mientras llega la respuesta del service: derivar del map de agendas
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
    // Cargar branches accesibles desde el service de sucursales
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.branchesFromService.set(list);
        // Dispatch loadAgendas por cada branch accesible (UX-4)
        list.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      });

    // Default filter a la branch del usuario actual si la conocemos
    const userBranch = this.session.currentUser()?.branch;
    if (userBranch != null) {
      this._filterBranchId.set(userBranch);
    }
  }

  protected reload(): void {
    const branches = this.branchesFromService();
    if (branches.length > 0) {
      branches.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      return;
    }
    // Fallback: si las branches aún no llegaron, re-ejecutar el flow del service.
    this.sucursalesService
      .listBranchesForSelector()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.branchesFromService.set(list);
        list.forEach(b => this.store.dispatch(loadAgendas({ branchId: b.id })));
      });
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
