import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
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
import { ScheduledAppointmentsDrawerComponent } from '../../components/scheduled-appointments-drawer.component';
import { RecepcionSinTotemComponent } from './recepcion-sin-totem.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { AtencionDashboardComponent } from '@features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component';

@Component({
  selector: 'app-recepcion-page',
  standalone: true,
  imports: [
    SkeletonModule,
    ToastModule,
    TabsModule,
    RecepcionConTotemComponent,
    RecepcionSinTotemComponent,
    BoxOccupationWidgetComponent,
    BoxSelectorModalComponent,
    AtencionDashboardComponent,
    ButtonModule,
    ScheduledAppointmentsDrawerComponent,
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
  private readonly router = inject(Router);

  /** Drawer de "Turnos del día" — controlado por el botón global del header. */
  protected readonly drawerOpen = signal(false);

  protected enabled = this.store.selectSignal(selectBranchTotemEnabled);
  protected loading = this.store.selectSignal(selectBranchTotemLoading);

  protected branchId = this.resolveBranchId();

  // Box-occupation signals — resolved on init and passed to child components.
  protected readonly currentUserId = signal<number>(0);
  protected readonly totalBoxes = signal<number>(1);
  /** Si el user cierra el modal sin elegir box, lo respetamos hasta que vuelva a abrir manual. */
  protected readonly selectorDismissed = signal<boolean>(false);

  private readonly allOccupations = this.store.selectSignal(selectAllOccupations);
  protected readonly myOccupation = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId()) ?? null,
  );

  // Modal abierto cuando: user conocido, branch valido, sin box, y no fue dismisseado.
  // Closable: el user puede cancelar y operar sin box (la TV cae a fallback derivado).
  protected readonly selectorVisible = computed(
    () => this.currentUserId() > 0
       && this.branchContext.branchId() != null
       && this.myOccupation() == null
       && !this.selectorDismissed(),
  );

  ngOnInit(): void {
    // Si no hay branch resolvible, mostramos un warning visible en console.
    // El usuario debe logoutear y loguear de nuevo para que el JWT tenga la branch
    // actualizada (caso típico: admin recién asignado a sucursal por SQL).
    if (this.branchId == null) {
      console.warn('[recepcion] Sin sucursal asignada al user. Logueate de nuevo o pedile a un admin que te asigne una.');
      return;
    }
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

  protected onSelectorClosed(): void {
    this.selectorDismissed.set(true);
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  protected onDrawerVisibleChange(visible: boolean): void {
    this.drawerOpen.set(visible);
  }

  /** Nueva atención en blanco (sin DNI ni queue entry). */
  protected onNuevaAtencionBlanco(): void {
    this.router.navigate(['/analitica/atencion/nueva']);
  }

  /**
   * Resuelve la sucursal del operador. Devuelve null si no tiene branch
   * asignada — la pagina muestra warning en consola y NO inicializa box-occupation.
   *
   * Prioridad:
   *  1) branch persistida (localStorage via OperatorBranchContextService)
   *  2) branch del JWT del user (UserSessionService.currentUser.branch)
   */
  private resolveBranchId(): number | null {
    const stored = this.branchContext.branchId();
    if (stored != null) return stored;
    const fromUser = this.session.currentUser()?.branch ?? null;
    return fromUser ?? null;
  }
}
