import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadBranchTotemConfig } from '../../store/branch-totem-config/branch-totem-config.actions';
import {
  selectBranchTotemEnabled,
  selectBranchTotemLoading,
} from '../../store/branch-totem-config/branch-totem-config.selectors';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion.page.html',
  styleUrl: './recepcion.page.scss',
})
export class RecepcionPage implements OnInit {
  private store = inject(Store);
  private session = inject(UserSessionService);
  private branchContext = inject(OperatorBranchContextService);

  protected enabled = this.store.selectSignal(selectBranchTotemEnabled);
  protected loading = this.store.selectSignal(selectBranchTotemLoading);

  protected branchId = this.resolveBranchId();

  ngOnInit(): void {
    // Si el operador no tiene branch persistida en localStorage, dejamos la
    // que resolvimos (user.branch o fallback 1) como inicial -- el FAB le
    // permite cambiarla en cualquier momento.
    if (this.branchContext.branchId() == null) {
      this.branchContext.setBranchId(this.branchId);
    }
    this.store.dispatch(loadBranchTotemConfig({ branchId: this.branchId }));
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
