import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Coverage } from '../../models/patient.model';
import {
  CoverageCatalog, EMPTY_CATALOG, PlanOption,
  insurerNameForPlan, planName, plansForInsurer, selectableInsurers,
} from '../../models/coverage-catalog.model';
import { CoverageCatalogService } from '../../services/coverage-catalog.service';

/**
 * Carga de coberturas — Diseño B: una barra de alta (Obra social → Plan → N° afiliado → Agregar)
 * con cascada real contra el catálogo, y una tabla (estilo tabla genérica) que lista lo cargado.
 * "Particular" es una fila fija por defecto: un paciente sin obra social ES particular, así que
 * no se persiste como cobertura — el FormArray solo contiene las obras sociales agregadas.
 */
@Component({
  selector: 'pat-coverage-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, SelectModule,
    CheckboxModule, RadioButtonModule,
  ],
  template: `
    <div class="flex flex-col gap-3">
      <!-- Barra de alta: cascada OS → Plan → N° afiliado → Agregar -->
      <div class="cv-toolbar">
        <div class="cv-toolbar__field cv-toolbar__field--grow">
          <label class="pat-form__label">Obra social</label>
          <p-select [options]="osOptions()" [ngModel]="selInsurer()" (ngModelChange)="onInsurerChange($event)"
                    optionLabel="displayLabel" optionValue="id" placeholder="Elegí una obra social"
                    appendTo="body" [filter]="true" filterBy="displayLabel" class="w-full" />
        </div>
        <div class="cv-toolbar__field cv-toolbar__field--grow">
          <label class="pat-form__label">Plan</label>
          <p-select [options]="planOptions()" [ngModel]="selPlan()" (ngModelChange)="selPlan.set($event)"
                    optionLabel="name" optionValue="planId" placeholder="Elegí el plan"
                    [disabled]="selInsurer() == null" appendTo="body" class="w-full" />
        </div>
        <div class="cv-toolbar__field">
          <label class="pat-form__label">N° afiliado</label>
          <input pInputText [ngModel]="selMember()" (ngModelChange)="selMember.set($event)"
                 [disabled]="selPlan() == null" class="pat-form__input" placeholder="N° afiliado" />
        </div>
        <p-button label="Agregar" severity="secondary" [outlined]="true"
                  [disabled]="!canAdd()" (onClick)="add()" />
      </div>

      <!-- Tabla de coberturas (estilo tabla genérica) -->
      <div class="cv-table">
        <table>
          <thead>
            <tr>
              <th>Obra social</th>
              <th>Plan</th>
              <th>N° afiliado</th>
              <th class="cv-center">Principal</th>
              <th class="cv-center">Activa</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <!-- Fila fija: Particular (default). Principal cuando ninguna OS lo es. -->
            <tr>
              <td>Particular</td>
              <td class="cv-muted">—</td>
              <td class="cv-muted">—</td>
              <td class="cv-center">
                <p-radioButton name="cv-primary" [value]="'particular'" [ngModel]="primarySelection()"
                               (ngModelChange)="selectPrimary('particular')" [ngModelOptions]="{ standalone: true }" />
              </td>
              <td class="cv-center cv-muted">—</td>
              <td></td>
            </tr>
            @for (group of array().controls; track group; let i = $index) {
              <tr [formGroup]="$any(group)">
                <td>{{ insurerNameForPlan(catalog(), $any(group).value.planId) }}</td>
                <td>{{ planName(catalog(), $any(group).value.planId) }}</td>
                <td>{{ $any(group).value.memberNumber || '—' }}</td>
                <td class="cv-center">
                  <p-radioButton name="cv-primary" [value]="i" [ngModel]="primarySelection()"
                                 (ngModelChange)="selectPrimary(i)" [ngModelOptions]="{ standalone: true }" />
                </td>
                <td class="cv-center">
                  <p-checkbox formControlName="active" [binary]="true" />
                </td>
                <td class="cv-center">
                  <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                            (onClick)="remove(i)" ariaLabel="Eliminar cobertura" />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cv-toolbar {
      display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
      padding: 12px; border: 1px solid #e8edf3; border-radius: 10px; background: #f8fafc;
    }
    .cv-toolbar__field { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    .cv-toolbar__field--grow { flex: 1 1 220px; }

    .cv-table { border: 1px solid #e8edf3; border-radius: 10px; overflow: hidden; }
    .cv-table table { width: 100%; border-collapse: collapse; }
    .cv-table thead th {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 9px 14px; color: #475569; font-weight: 700; background: #f4f7fb;
      text-align: left; white-space: nowrap;
    }
    .cv-table tbody td { font-size: 13px; padding: 7px 14px; border: none; }
    .cv-table tbody tr:nth-child(even) { background: #fafbfd; }
    .cv-center { text-align: center; }
    .cv-muted { color: #94a3b8; }
  `],
})
export class CoverageSectionComponent implements OnInit {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  private readonly catalogService = inject(CoverageCatalogService);

  readonly catalog = signal<CoverageCatalog>(EMPTY_CATALOG);

  // Estado local de la barra de alta (no forma parte del FormArray).
  readonly selInsurer = signal<number | null>(null);
  readonly selPlan = signal<number | null>(null);
  readonly selMember = signal<string>('');

  readonly osOptions = computed(() => selectableInsurers(this.catalog()));
  readonly planOptions = computed<PlanOption[]>(() => plansForInsurer(this.catalog(), this.selInsurer()));
  readonly canAdd = computed(() =>
    this.selInsurer() != null && this.selPlan() != null && this.selMember().trim().length > 0,
  );

  // Helpers expuestos al template para resolver labels.
  readonly insurerNameForPlan = insurerNameForPlan;
  readonly planName = planName;

  ngOnInit(): void {
    this.catalogService.getCatalog().subscribe({
      next: (cat) => this.catalog.set(cat),
      error: () => { /* catálogo vacío; el error no se expone al usuario */ },
    });
  }

  onInsurerChange(insurerId: number | null): void {
    this.selInsurer.set(insurerId ?? null);
    // Cambiar de obra social resetea plan y afiliado (cascada).
    this.selPlan.set(null);
    this.selMember.set('');
  }

  add(): void {
    if (!this.canAdd()) return;
    this.array().push(this.fb.group({
      id: [null],
      planId: [this.selPlan(), Validators.required],
      memberNumber: [this.selMember().trim(), Validators.required],
      isPrimary: [false],
      active: [true],
    }));
    this.selInsurer.set(null);
    this.selPlan.set(null);
    this.selMember.set('');
  }

  remove(index: number): void {
    this.array().removeAt(index);
  }

  /** 'particular' cuando ninguna OS está marcada como principal, si no el índice de la OS principal. */
  primarySelection(): number | 'particular' {
    const idx = this.array().controls.findIndex((c) => c.value.isPrimary === true);
    return idx >= 0 ? idx : 'particular';
  }

  selectPrimary(target: number | 'particular'): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: target !== 'particular' && i === target }));
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
