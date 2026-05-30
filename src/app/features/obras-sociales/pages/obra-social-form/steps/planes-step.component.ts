import { ChangeDetectionStrategy, Component, inject, Input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { NbuOption } from '../../../models/catalogs.model';

@Component({
  selector: 'os-planes-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, InputTextModule, SelectModule, CurrencyArPipe],
  template: `
    <div class="max-w-4xl">
      <h3 class="text-base font-semibold mb-2">Agregar plan</h3>
      <div [formGroup]="draft" class="grid grid-cols-3 gap-3 mb-2">
        <input pInputText formControlName="code" placeholder="Código *" maxlength="20" />
        <input pInputText formControlName="acronym" placeholder="Sigla *" maxlength="10" />
        <input pInputText formControlName="name" placeholder="Nombre *" maxlength="100" />
        <label class="flex flex-col gap-1 text-xs text-surface-500">Vigente desde *
          <input type="date" pInputText formControlName="validFromDate" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">Versión NBU *
          <p-select formControlName="versionNbu" [options]="nbuOptions" optionLabel="label" optionValue="value" placeholder="NBU" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">Valor U.B. *
          <input type="number" pInputText formControlName="ubValue" min="0" step="0.01" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">% Cobertura *
          <input type="number" pInputText formControlName="coveragePercentage" min="0" max="100" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-surface-500">IVA % *
          <input type="number" pInputText formControlName="iva" min="0" max="100" />
        </label>
        <div class="flex items-end">
          <p-button label="Agregar plan" icon="pi pi-plus" size="small" (onClick)="addPlan()" [disabled]="draft.invalid" />
        </div>
      </div>
      @if (dupError()) { <small class="text-red-600 block mb-2">Ya hay un plan con ese código.</small> }

      <p-table [value]="array.controls" dataKey="value.code">
        <ng-template pTemplate="header">
          <tr><th>Código</th><th>Nombre</th><th>Vigente desde</th><th>NBU</th><th>Valor U.B.</th><th>% Cob.</th><th>IVA</th><th></th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-ctrl let-i="rowIndex">
          <tr>
            <td>{{ ctrl.value.code }}</td>
            <td>{{ ctrl.value.name }}</td>
            <td>{{ ctrl.value.validFromDate }}</td>
            <td>{{ nbuLabel(ctrl.value.versionNbu) }}</td>
            <td>{{ ctrl.value.ubValue | currencyAr }}</td>
            <td>{{ ctrl.value.coveragePercentage }}%</td>
            <td>{{ ctrl.value.iva }}%</td>
            <td class="text-right">
              <p-button [text]="true" icon="pi pi-trash" severity="danger" pTooltip="Quitar" (onClick)="removePlan(i)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-surface-500 text-sm py-3">Todavía no agregaste planes. Agregá al menos uno.</td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class PlanesStepComponent {
  private readonly fb = inject(FormBuilder);
  @Input({ required: true }) array!: FormArray<FormGroup>;
  @Input({ required: true }) nbuOptions!: NbuOption[];
  readonly dupError = signal(false);

  readonly draft: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    acronym: ['', [Validators.required, Validators.maxLength(10)]],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    validFromDate: ['', Validators.required],
    versionNbu: [null, Validators.required],
    ubValue: [null, [Validators.required, Validators.min(0.01)]],
    coveragePercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    iva: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  addPlan(): void {
    if (this.draft.invalid) { this.draft.markAllAsTouched(); return; }
    const v = this.draft.getRawValue() as { code: string };
    const exists = this.array.controls.some((c) => (c.value.code as string)?.toLowerCase() === v.code.toLowerCase());
    if (exists) { this.dupError.set(true); return; }
    this.dupError.set(false);
    this.array.push(this.fb.group({ ...this.draft.getRawValue() }));
    this.draft.reset({ code: '', acronym: '', name: '', validFromDate: '', versionNbu: null, ubValue: null, coveragePercentage: null, iva: null });
  }

  removePlan(i: number): void { this.array.removeAt(i); }

  nbuLabel(value: number): string {
    return this.nbuOptions.find((o) => o.value === value)?.label ?? String(value);
  }
}
