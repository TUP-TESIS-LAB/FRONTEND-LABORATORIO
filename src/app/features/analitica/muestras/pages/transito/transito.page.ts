import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TransitoLotesService } from '../../services/transito-lotes.service';

@Component({
  selector: 'app-transito-page',
  standalone: true,
  templateUrl: './transito.page.html',
  styleUrl: './transito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoPage {
  protected readonly service = inject(TransitoLotesService);
}
