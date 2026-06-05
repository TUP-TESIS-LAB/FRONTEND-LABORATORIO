import {
  ChangeDetectionStrategy, Component, Input,
  computed, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { BoxType } from '../models/box-occupation.model';
import { selectAllOccupations } from '../store/box-occupation.selectors';
import { releaseBox } from '../store/box-occupation.actions';
import { BoxSelectorModalComponent } from './box-selector-modal.component';

@Component({
  selector: 'app-box-occupation-widget',
  standalone: true,
  imports: [ButtonModule, MenuModule, BoxSelectorModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './box-occupation-widget.component.html',
  styleUrl: './box-occupation-widget.component.scss',
})
export class BoxOccupationWidgetComponent {
  @Input({ required: true }) branchId!: number;
  @Input({ required: true }) currentUserId!: number;
  @Input({ required: true }) totalBoxes!: number;
  @Input() boxType: BoxType = 'ATENCION';

  private store = inject(Store);
  protected readonly modalVisible = signal(false);
  private readonly allOccupations = this.store.selectSignal(selectAllOccupations);

  protected readonly myBox = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId && o.boxType === this.boxType) ?? null,
  );

  protected readonly menuItems: MenuItem[] = [
    { label: 'Cambiar box', icon: 'pi pi-refresh', command: () => this.modalVisible.set(true) },
    { label: 'Liberar box', icon: 'pi pi-times', command: () => this.onRelease() },
  ];

  onRelease(): void {
    this.store.dispatch(releaseBox({ branchId: this.branchId, boxType: this.boxType }));
  }
}
