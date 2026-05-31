import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SucursalesService } from '../../../../../sucursales/services/sucursales.service';

@Component({
  selector: 'app-step-sucursal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SelectModule],
  templateUrl: './step-sucursal.component.html',
  styleUrl: './step-sucursal.component.scss',
})
export class StepSucursalComponent implements OnInit {
  @Input() initialBranchId: number | null = null;
  @Output() next = new EventEmitter<{ branchId: number }>();

  private readonly fb = inject(FormBuilder);
  private readonly sucursalesService = inject(SucursalesService);

  protected readonly branches = signal<{ id: number; name: string }[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    branchId: [null as number | null, Validators.required],
  });

  // Espejo signal del estado del form para que la pagina pueda habilitar
  // su boton "Continuar →" en el footer reactivamente via @ViewChild.
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValid = (): boolean => this.status() === 'VALID';

  ngOnInit(): void {
    this.sucursalesService
      .listBranchesForSelector()
      .subscribe((list) => this.branches.set(list));

    if (this.initialBranchId != null) {
      this.form.patchValue({ branchId: this.initialBranchId });
    }
  }

  /**
   * Llamado por la pagina via @ViewChild cuando el usuario hace click en
   * "Continuar →" del footer. Valida y emite (next) con el branchId elegido.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.next.emit({ branchId: this.form.value.branchId! });
  }
}
