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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SucursalesService } from '../../../../../sucursales/services/sucursales.service';

@Component({
  selector: 'app-step-sucursal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, SelectModule],
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

  ngOnInit(): void {
    this.sucursalesService
      .listBranchesForSelector()
      .subscribe((list) => this.branches.set(list));

    if (this.initialBranchId != null) {
      this.form.patchValue({ branchId: this.initialBranchId });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.next.emit({ branchId: this.form.value.branchId! });
  }
}
