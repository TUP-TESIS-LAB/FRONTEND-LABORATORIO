import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import {
  selectSelectedAreaId,
  selectSections,
  selectAreas,
} from '../../../store/sucursal.selectors';
import {
  loadSections,
  addSection,
  updateSection,
  deleteSection,
} from '../../../store/sucursal.actions';
import { Section, SectionCreateInput } from '../../../models/section.model';

@Component({
  selector: 'app-sections-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TooltipModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
  ],
  templateUrl: './sections-panel.component.html',
  styleUrl: './sections-panel.component.scss',
})
export class SectionsPanelComponent {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);

  protected readonly selectedAreaId = this.store.selectSignal(selectSelectedAreaId);
  private readonly allSections = this.store.selectSignal(selectSections);
  private readonly allAreas = this.store.selectSignal(selectAreas);

  protected readonly sections = computed(() => {
    const areaId = this.selectedAreaId();
    return areaId == null ? [] : this.allSections().filter(s => s.areaId === areaId);
  });

  protected readonly selectedAreaName = computed(() => {
    const id = this.selectedAreaId();
    if (id == null) return null;
    return this.allAreas().find(a => a.id === id)?.name ?? null;
  });

  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Section | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });

  constructor() {
    // Reload sections for the selected area each time it changes.
    // This ensures freshly created areas (with 0 sections) still trigger a load,
    // and switching areas always fetches fresh data from the server.
    effect(() => {
      const areaId = this.selectedAreaId();
      if (areaId != null) {
        this.store.dispatch(loadSections({ areaId }));
      }
    });
  }

  openNew() {
    if (this.selectedAreaId() == null) return;
    this.editing.set(null);
    this.form.reset({ name: '' });
    this.dialogVisible.set(true);
  }

  openEdit(section: Section) {
    this.editing.set(section);
    this.form.patchValue({ name: section.name });
    this.dialogVisible.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    const name = this.form.value.name!.trim();
    const e = this.editing();
    if (e) {
      this.store.dispatch(updateSection({ id: e.id, input: { name, areaId: e.areaId } }));
    } else {
      const areaId = this.selectedAreaId();
      if (areaId == null) return;
      const input: SectionCreateInput = { name, areaId };
      this.store.dispatch(addSection({ input }));
    }
    this.dialogVisible.set(false);
  }

  remove(section: Section) {
    this.confirm.confirm({
      message: `¿Eliminar la sección "${section.name}"? Se conservará el histórico (soft-delete).`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(deleteSection({ id: section.id })),
    });
  }
}
