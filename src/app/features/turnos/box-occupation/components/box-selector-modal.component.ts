import {
  ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnChanges, Output,
  SimpleChanges, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { BoxType, BoxOccupation } from '../models/box-occupation.model';
import { selectAllOccupations } from '../store/box-occupation.selectors';
import { loadBoxOccupations, occupyBox, occupyBoxSuccess, occupyBoxFailure } from '../store/box-occupation.actions';

@Component({
  selector: 'app-box-selector-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './box-selector-modal.component.html',
  styleUrl: './box-selector-modal.component.scss',
})
export class BoxSelectorModalComponent implements OnChanges {
  @Input({ required: true }) branchId!: number;
  @Input({ required: true }) totalBoxes!: number;
  @Input({ required: true }) currentUserId!: number;
  @Input() boxType: BoxType = 'ATENCION';
  @Input() visible: boolean = false;
  @Input() canClose: boolean = false;

  @Output() closed = new EventEmitter<void>();

  private store = inject(Store);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);

  protected readonly allOccupations = this.store.selectSignal(selectAllOccupations);
  protected readonly myOccupation = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId) ?? null,
  );

  /** Mientras está pendiente la respuesta del occupy. Bloquea clicks en el grid. */
  protected readonly pending = signal<boolean>(false);
  /** Mensaje warning inline cuando el último intento falló (ej. 409). Reset al elegir otro box. */
  protected readonly warningMsg = signal<string | null>(null);

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

  constructor() {
    // Suscripción persistente: el modal se queda abierto durante el pending,
    // y reacciona al action result para cerrar (success) o mostrar warning (failure).
    this.actions$.pipe(ofType(occupyBoxSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pending.set(false);
        this.warningMsg.set(null);
        this.closed.emit();
      });
    this.actions$.pipe(ofType(occupyBoxFailure), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ error }) => {
        this.pending.set(false);
        this.warningMsg.set(error);
      });
  }

  /**
   * Cuando el modal pasa de cerrado a abierto, dispara un refresh de la lista
   * de occupations para que la grid refleje el estado real (otras secretarias
   * pueden haber tomado boxes desde la última vez que se cargó el store).
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true && !changes['visible'].previousValue) {
      this.warningMsg.set(null);
      this.store.dispatch(loadBoxOccupations({ branchId: this.branchId, boxType: this.boxType }));
    }
  }

  onSlotClick(boxNumber: number, occupied: BoxOccupation | null): void {
    if (occupied || this.pending()) return;  // ocupado o esperando respuesta — no action
    this.warningMsg.set(null);
    this.pending.set(true);
    this.store.dispatch(occupyBox({ branchId: this.branchId, input: { boxType: this.boxType, boxNumber } }));
    // NO cerramos acá; esperamos al success/failure en la subscripción de arriba.
  }

  onClose(): void {
    if (this.canClose) {
      this.warningMsg.set(null);
      this.closed.emit();
    }
  }
}
