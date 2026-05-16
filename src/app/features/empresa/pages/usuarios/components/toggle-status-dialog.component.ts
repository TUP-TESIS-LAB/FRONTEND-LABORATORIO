import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { Usuario, CambiarEstadoPayload } from '../../../models/usuario.model';

@Component({
  selector: 'emp-toggle-status-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visibleInternal"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '32rem' }"
      [header]="usuario?.active ? 'Desactivar usuario' : 'Activar usuario'"
      (onHide)="cancel.emit()">
      <p style="margin: 0 0 var(--space-3)">
        {{ usuario?.firstName }} {{ usuario?.lastName }}
        <span class="ui-text-muted">({{ usuario?.email }})</span>
      </p>

      @if (usuario?.active) {
        <form [formGroup]="form" class="pat-form__field">
          <label class="pat-form__label" for="reason">Motivo (obligatorio)*</label>
          <textarea pTextarea id="reason" rows="4" formControlName="reason"
                    class="pat-form__input"
                    placeholder="Indicá el motivo de la desactivación"></textarea>
        </form>
      } @else {
        <p class="ui-text-muted">Confirmá para reactivar al usuario.</p>
      }

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" text (onClick)="cancel.emit()" />
        <p-button
          [label]="usuario?.active ? 'Desactivar' : 'Activar'"
          [severity]="usuario?.active ? 'warn' : 'success'"
          [disabled]="!canSubmit() || saving"
          [loading]="saving"
          (onClick)="onConfirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ToggleStatusDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() confirm = new EventEmitter<{ id: number; payload: CambiarEstadoPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;
  form = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => {
    if (!this.usuario) return false;
    if (!this.usuario.active) return true;
    return this.status() === 'VALID';
  });

  private wasVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      // Reset only on closed→open transition to avoid wiping a typed reason
      // if the parent re-emits the same usuario while the dialog is open.
      if (this.visible && !this.wasVisible) {
        this.form.reset({ reason: '' });
      }
      this.wasVisible = this.visible;
    }
  }

  onConfirm(): void {
    if (!this.usuario) return;
    const isActive = !this.usuario.active;
    const reason = isActive ? 'Reactivación' : (this.form.value.reason as string);
    this.confirm.emit({ id: this.usuario.id, payload: { isActive, reason } });
  }
}
