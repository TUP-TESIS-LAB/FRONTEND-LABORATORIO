import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Sucursal } from '../models/sucursal.model';

@Component({
  selector: 'app-sucursal-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class SucursalFormModalComponent {
  @Input() sucursal: Sucursal | null = null;
  @Output() closed = new EventEmitter<void>();
}
