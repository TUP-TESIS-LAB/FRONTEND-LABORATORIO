import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { selectCurrentSucursal, selectLoadingDetail } from '../../../store/sucursal.selectors';
import { loadDetail } from '../../../store/sucursal.actions';
import { DatosTabComponent } from './tabs/datos-tab.component';
import { HorariosTabComponent } from './tabs/horarios-tab.component';
import { ContactosTabComponent } from './tabs/contactos-tab.component';
import { WorkspacesStepComponent } from '../sucursal-alta-stepper/steps/workspaces-step.component';
import { TotemTabComponent } from './tabs/totem-tab.component';

@Component({
  selector: 'app-sucursal-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabsModule, ButtonModule, ToastModule, DatosTabComponent, HorariosTabComponent, ContactosTabComponent, WorkspacesStepComponent, TotemTabComponent],
  templateUrl: './sucursal-detalle.page.html',
  styleUrl: './sucursal-detalle.page.scss',
  providers: [MessageService],
})
export class SucursalDetallePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);

  protected readonly branchId = signal<number | null>(null);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);
  protected readonly loading = this.store.selectSignal(selectLoadingDetail);

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!idParam || isNaN(id) || id <= 0) {
      this.router.navigate(['/sucursales/configuracion']);
      return;
    }
    this.branchId.set(id);
    this.store.dispatch(loadDetail({ branchId: id }));
  }

  goBack() {
    this.router.navigate(['/sucursales/configuracion']);
  }
}
