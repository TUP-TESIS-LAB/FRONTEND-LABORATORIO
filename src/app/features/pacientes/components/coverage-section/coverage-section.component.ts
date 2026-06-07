import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Coverage } from '../../models/patient.model';
import { CoveragePlanOption } from '../../models/coverage-plans.catalog';
import { CoveragePlansService } from '../../services/coverage-plans.service';

@Component({
  selector: 'pat-coverage-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="flex flex-col gap-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="pat-form__row">
          <div class="pat-form__row-header" style="justify-content:flex-end">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small" (onClick)="remove(i)" ariaLabel="Eliminar cobertura" />
          </div>
          <div class="pat-form__grid">
            <div class="pat-form__field">
              <label class="pat-form__label">Obra social / Plan</label>
              <p-select formControlName="planId" [options]="planOptions" optionLabel="label" optionValue="planId" placeholder="Seleccionar plan" appendTo="body" class="w-full" />
            </div>
            <div class="pat-form__field">
              <label class="pat-form__label">N° afiliado</label>
              <input pInputText formControlName="memberNumber" class="pat-form__input">
            </div>
          </div>
          <div class="pat-form__row-flags">
            <label class="pat-form__row-flag">
              <p-radioButton name="coverage-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
              <span>Primaria</span>
            </label>
            <label class="pat-form__row-flag">
              <p-toggleSwitch formControlName="active" />
              <span>Activa</span>
            </label>
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar cobertura" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class CoverageSectionComponent implements OnInit {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  private readonly plansService = inject(CoveragePlansService);
  planOptions: CoveragePlanOption[] = [];

  ngOnInit(): void {
    this.plansService.getActivePlans().subscribe({
      next: (plans) => (this.planOptions = plans),
      error: () => { /* dropdown queda vacío; error no se expone al usuario */ },
    });
  }

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null],
      planId: [null, Validators.required],
      memberNumber: ['', Validators.required],
      isPrimary: [isPrimary], active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) this.array().at(0).patchValue({ isPrimary: true });
  }

  setPrimary(index: number): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: i === index }));
  }

  static toFormGroup(fb: FormBuilder, c: Coverage): FormGroup {
    return fb.group({
      id: [c.id ?? null],
      planId: [c.planId, Validators.required],
      memberNumber: [c.memberNumber, Validators.required],
      isPrimary: [c.isPrimary], active: [c.active],
    });
  }
}
