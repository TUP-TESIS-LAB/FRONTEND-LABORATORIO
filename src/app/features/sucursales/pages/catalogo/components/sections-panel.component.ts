import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  updateSection,
  deleteSection,
} from '../../../store/sucursal.actions';
import { Section } from '../../../models/section.model';

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

  protected readonly sections = computed(() => this.allSections());

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
    // Las secciones ya no pertenecen a un área: se cargan todas las del tenant una sola vez.
    this.store.dispatch(loadSections());
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
      this.store.dispatch(updateSection({ id: e.id, input: { name } }));
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
