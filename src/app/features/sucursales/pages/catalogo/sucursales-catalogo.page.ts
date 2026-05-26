import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CardModule } from 'primeng/card';
import { loadAreas } from '../../store/sucursal.actions';

@Component({
  selector: 'app-sucursales-catalogo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardModule,
    // ! T5 and T6 will add AreasPanelComponent and SectionsPanelComponent here.
    // For T4 they are placeholders — render plain text "Panel pendiente (T5/T6)".
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
