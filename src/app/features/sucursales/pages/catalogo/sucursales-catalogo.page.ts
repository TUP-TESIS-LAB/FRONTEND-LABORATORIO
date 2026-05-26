import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CardModule } from 'primeng/card';
import { loadAreas } from '../../store/sucursal.actions';
import { AreasPanelComponent } from './components/areas-panel.component';
import { SectionsPanelComponent } from './components/sections-panel.component';

@Component({
  selector: 'app-sucursales-catalogo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardModule,
    AreasPanelComponent,
    SectionsPanelComponent,
  ],
  templateUrl: './sucursales-catalogo.page.html',
  styleUrl: './sucursales-catalogo.page.scss',
})
export class SucursalesCatalogoPage implements OnInit {
  private store = inject(Store);

  ngOnInit() {
    this.store.dispatch(loadAreas());
  }
}
