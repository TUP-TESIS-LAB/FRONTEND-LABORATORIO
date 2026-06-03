import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { selectAreas } from '../../../store/sucursal.selectors';
import {
  addArea,
  updateArea,
  toggleAreaStatus,
  selectAreaForSections,
} from '../../../store/sucursal.actions';
import { Area, AreaType, AreaCreateInput } from '../../../models/sucursal.model';

const AREA_TYPE_OPTIONS: { label: string; value: AreaType }[] = [
  { label: 'Química Clínica', value: 'QUIMICA_CLINICA' },
  { label: 'Hematología y Hemostasia', value: 'HEMATOLOGIA_HEMOSTASIA' },
  { label: 'Nefrología', value: 'NEFROLOGIA' },
  { label: 'Medio Interno', value: 'MEDIO_INTERNO' },
  { label: 'Endocrinología y Virología', value: 'ENDOCRINOLOGIA_VIROLOGIA' },
  { label: 'Microbiología', value: 'MICROBIOLOGIA' },
  { label: 'Inmunología y Serología', value: 'INMUNOLOGIA_SEROLOGIA' },
  { label: 'Externo', value: 'EXTERNO' },
  { label: 'Otro', value: 'OTRO' },
];

@Component({
  selector: 'app-areas-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
  ],
  templateUrl: './areas-panel.component.html',
  styleUrl: './areas-panel.component.scss',
})
export class AreasPanelComponent {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);

  protected readonly areas = this.store.selectSignal(selectAreas);
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Area | null>(null);
  protected readonly typeOptions = AREA_TYPE_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    areaType: ['QUIMICA_CLINICA' as AreaType, Validators.required],
    externalLabName: [''],
  });

  openNew() {
    this.editing.set(null);
    this.form.reset({ name: '', areaType: 'QUIMICA_CLINICA', externalLabName: '' });
    this.dialogVisible.set(true);
  }

  openEdit(area: Area) {
    this.editing.set(area);
    this.form.patchValue({
      name: area.name,
      areaType: area.areaType,
      externalLabName: area.externalLabName ?? '',
    });
    this.dialogVisible.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const input: AreaCreateInput = {
      name: raw.name.trim(),
      areaType: raw.areaType,
      externalLabName: raw.areaType === 'EXTERNO' ? raw.externalLabName.trim() || null : null,
    };
    const e = this.editing();
    if (e) {
      this.store.dispatch(updateArea({ id: e.id, input }));
    } else {
      this.store.dispatch(addArea({ input }));
    }
    this.dialogVisible.set(false);
  }

  remove(area: Area) {
    this.confirm.confirm({
      message: `¿Eliminar el área "${area.name}"? Se conservará el histórico (soft-delete).`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(toggleAreaStatus({ id: area.id })),
    });
  }

  selectForSections(area: Area) {
    this.store.dispatch(selectAreaForSections({ areaId: area.id }));
  }

  labelForType(type: AreaType): string {
    return AREA_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }
}
