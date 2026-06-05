import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
  computed, inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { BoxType, BoxOccupation } from '../models/box-occupation.model';
import { selectAllOccupations } from '../store/box-occupation.selectors';
import { occupyBox } from '../store/box-occupation.actions';

@Component({
  selector: 'app-box-selector-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './box-selector-modal.component.html',
  styleUrl: './box-selector-modal.component.scss',
})
export class BoxSelectorModalComponent {
  @Input({ required: true }) branchId!: number;
  @Input({ required: true }) totalBoxes!: number;
  @Input({ required: true }) currentUserId!: number;
  @Input() boxType: BoxType = 'ATENCION';
  @Input() visible: boolean = false;
  @Input() canClose: boolean = false;

  @Output() closed = new EventEmitter<void>();

  private store = inject(Store);
  protected readonly allOccupations = this.store.selectSignal(selectAllOccupations);
  protected readonly myOccupation = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId) ?? null,
  );

  protected slots = computed(() => {
    const map = new Map<number, BoxOccupation>();
    for (const o of this.allOccupations()) {
      if (o.boxType === this.boxType) map.set(o.boxNumber, o);
    }
    return Array.from({ length: this.totalBoxes }, (_, i) => {
      const n = i + 1;
      return { boxNumber: n, occupation: map.get(n) ?? null };
    });
  });

  protected allOccupied = computed(() => this.slots().every(s => s.occupation !== null));

  onSlotClick(boxNumber: number, occupied: BoxOccupation | null): void {
    if (occupied) return;  // ocupado por otro o por mí — no action
    this.store.dispatch(occupyBox({ branchId: this.branchId, input: { boxType: this.boxType, boxNumber } }));
    this.closed.emit();
  }

  onClose(): void {
    if (this.canClose) this.closed.emit();
  }
}
