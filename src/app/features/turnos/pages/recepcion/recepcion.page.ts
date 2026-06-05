import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { TokenService } from '@core/auth/token.service';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { loadBranchTotemConfig } from '../../store/branch-totem-config/branch-totem-config.actions';
import {
  selectBranchTotemEnabled,
  selectBranchTotemLoading,
} from '../../store/branch-totem-config/branch-totem-config.selectors';
import { loadBoxOccupations } from '../../box-occupation/store/box-occupation.actions';
import { selectAllOccupations } from '../../box-occupation/store/box-occupation.selectors';
import { BoxOccupationWidgetComponent } from '../../box-occupation/components/box-occupation-widget.component';
import { BoxSelectorModalComponent } from '../../box-occupation/components/box-selector-modal.component';
import { RecepcionConTotemComponent } from './recepcion-con-totem.component';
import { RecepcionSinTotemComponent } from './recepcion-sin-totem.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { OperatorBranchFabComponent } from '../../components/operator-branch-fab.component';

@Component({
  selector: 'app-recepcion-page',
  standalone: true,
  imports: [
    SkeletonModule,
    ToastModule,
    RecepcionConTotemComponent,
    RecepcionSinTotemComponent,
    OperatorBranchFabComponent,
    BoxOccupationWidgetComponent,
    BoxSelectorModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion.page.html',
  styleUrl: './recepcion.page.scss',
})
export class RecepcionPage implements OnInit {
  private store = inject(Store);
  private session = inject(UserSessionService);
  private tokens = inject(TokenService);
  private sucursalService = inject(SucursalService);
  protected readonly branchContext = inject(OperatorBranchContextService);

  protected enabled = this.store.selectSignal(selectBranchTotemEnabled);
  protected loading = this.store.selectSignal(selectBranchTotemLoading);

  protected branchId = this.resolveBranchId();

  // Box-occupation signals — resolved on init and passed to child components.
  protected readonly currentUserId = signal<number>(0);
  protected readonly totalBoxes = signal<number>(1);

  private readonly allOccupations = this.store.selectSignal(selectAllOccupations);
  protected readonly myOccupation = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId()) ?? null,
  );

  // Blocking modal: show when user id is known, branch is set, and user has no box.
  protected readonly selectorVisible = computed(
    () => this.currentUserId() > 0
       && this.branchContext.branchId() != null
       && this.myOccupation() == null,
  );

  ngOnInit(): void {
    if (this.branchContext.branchId() == null) {
      this.branchContext.setBranchId(this.branchId);
    }
    this.store.dispatch(loadBranchTotemConfig({ branchId: this.branchId }));

    // Resolve current user id from JWT (most reliable source at this point).
    const uid = this.tokens.getUserId() ?? this.session.currentUser()?.id ?? 0;
    this.currentUserId.set(uid);

    // Dispatch box-occupation load and fetch branch details for totalBoxes.
    const bid = this.branchContext.branchId() ?? this.branchId;
    this.store.dispatch(loadBoxOccupations({ branchId: bid, boxType: 'ATENCION' }));
    this.sucursalService.getById(bid).subscribe(b => this.totalBoxes.set(b.atencionBoxesCount));
  }

  /**
   * Prioridad: 1) branch persistida (localStorage via OperatorBranchContextService),
   * 2) branch del user actual (currentUser.branch del JWT), 3) fallback 1
   * (logueado con warning). Asi un operador sin branch fija puede elegir y
   * la eleccion sobrevive reloads.
   */
  private resolveBranchId(): number {
    const stored = this.branchContext.branchId();
    if (stored != null) return stored;
    const fromUser = this.session.currentUser()?.branch ?? null;
    if (fromUser != null) return fromUser;
    console.warn('[recepcion] sin branch en localStorage ni en user — usando default branchId=1');
    return 1;
  }
}
