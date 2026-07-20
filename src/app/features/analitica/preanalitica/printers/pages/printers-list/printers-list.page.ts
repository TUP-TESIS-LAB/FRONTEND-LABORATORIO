import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { PrinterTokenDialogComponent } from './components/printer-token-dialog.component';
import { Printer } from '../../models/printer.model';
import * as A from '../../store/printer.actions';
import { selectPrinters, selectPrintersLoading, selectLastRegisteredToken } from '../../store/printer.selectors';

@Component({
  selector: 'app-printers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    SelectModule, ConfirmDialogModule, ToastModule, TooltipModule, PageHeaderComponent, PrinterTokenDialogComponent,
  ],
  templateUrl: './printers-list.page.html',
  styleUrl: './printers-list.page.scss',
})
export class PrintersListPage implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);
  private sucursalService = inject(SucursalService);

  protected readonly printers = this.store.selectSignal(selectPrinters);
  protected readonly loading = this.store.selectSignal(selectPrintersLoading);
  protected readonly lastToken = this.store.selectSignal(selectLastRegisteredToken);
  protected readonly branches = signal<{ id: number; name: string }[]>([]);
  protected readonly dialogVisible = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    branchId: [null as number | null, Validators.required],
    ipAddress: ['', [Validators.required, Validators.pattern(/^\d{1,3}(\.\d{1,3}){3}$/)]],
    port: [9100, [Validators.required, Validators.min(1), Validators.max(65535)]],
  });

  ngOnInit(): void {
    this.store.dispatch(A.loadPrinters());
    this.sucursalService.list().subscribe(page =>
      this.branches.set((page.content ?? []).map(b => ({ id: b.id, name: b.description }))));
  }

  openNew(): void {
    this.form.reset({ name: '', branchId: null, ipAddress: '', port: 9100 });
    this.dialogVisible.set(true);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.store.dispatch(A.addPrinter({ input: { name: v.name, branchId: v.branchId!, ipAddress: v.ipAddress, port: v.port } }));
    this.dialogVisible.set(false);
  }

  remove(printer: Printer): void {
    this.confirm.confirm({
      message: `¿Eliminar la impresora "${printer.name}"?`,
      header: 'Confirmar eliminación', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(A.deletePrinter({ id: printer.id })),
    });
  }

  branchName(id: number): string {
    return this.branches().find(b => b.id === id)?.name ?? String(id);
  }

  onTokenDialogClose(): void {
    this.store.dispatch(A.clearLastToken());
  }
}
