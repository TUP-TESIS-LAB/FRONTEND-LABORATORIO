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

@Component({
  selector: 'app-recepcion-page',
  standalone: true,
  imports: [SkeletonModule, ToastModule, RecepcionConTotemComponent, RecepcionSinTotemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion.page.html',
  styleUrl: './recepcion.page.scss',
})
export class RecepcionPage implements OnInit {
  private store = inject(Store);
  private session = inject(UserSessionService);

  protected enabled = this.store.selectSignal(selectBranchTotemEnabled);
  protected loading = this.store.selectSignal(selectBranchTotemLoading);

  protected branchId = this.resolveBranchId();

  ngOnInit(): void {
    this.store.dispatch(loadBranchTotemConfig({ branchId: this.branchId }));
  }

  private resolveBranchId(): number {
    const id = this.session.currentUser()?.branch ?? null;
    if (id == null) {
      console.warn('[recepcion] currentUser.branch no resuelto — usando mock branchId=1');
      return 1;
    }
    return id;
  }
}
