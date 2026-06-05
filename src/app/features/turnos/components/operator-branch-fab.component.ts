import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OperatorBranchContextService } from '../services/operator-branch.context';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

interface BranchOption { id: number; name: string; }

@Component({
  selector: 'app-operator-branch-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operator-branch-fab.component.html',
  styleUrl: './operator-branch-fab.component.scss',
})
export class OperatorBranchFabComponent implements OnInit {
  private context = inject(OperatorBranchContextService);
  private sucursalesService = inject(SucursalesService);
  private destroyRef = inject(DestroyRef);

  protected readonly branches = signal<BranchOption[]>([]);
  protected readonly expanded = signal(false);
  protected readonly currentBranchId = this.context.branchId;

  protected readonly currentBranchName = computed(() => {
    const id = this.currentBranchId();
    if (id == null) return 'Elegir sucursal';
    return this.branches().find(b => b.id === id)?.name ?? `Sucursal #${id}`;
  });

  ngOnInit(): void {
    this.sucursalesService.listBranchesForSelector()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.branches.set(list));
  }

  toggle(): void { this.expanded.update(v => !v); }
  close(): void { this.expanded.set(false); }

  select(id: number): void {
    if (id === this.currentBranchId()) {
      this.expanded.set(false);
      return;
    }
    const name = this.branches().find(b => b.id === id)?.name ?? `Sucursal #${id}`;
    this.context.setBranch(id, name);
    this.expanded.set(false);
    // Hard reload para que toda la pagina se cargue con el nuevo branchId,
    // sin tener que propagar el cambio por la cadena de inputs.
    setTimeout(() => location.reload(), 50);
  }
}
