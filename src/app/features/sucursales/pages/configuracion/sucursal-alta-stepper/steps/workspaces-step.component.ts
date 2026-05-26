import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output,
  computed, inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import {
  selectAreas, selectSections, selectWorkspaces,
} from '../../../../store/sucursal.selectors';
import {
  loadAreas, loadSections, loadWorkspaces, syncWorkspaces,
} from '../../../../store/sucursal.actions';
import { BranchWorkspace, BranchWorkspaceCreateInput } from '../../../../models/branch-workspace.model';

@Component({
  selector: 'app-workspaces-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TableModule, ButtonModule, SelectModule],
  templateUrl: './workspaces-step.component.html',
  styleUrl: './workspaces-step.component.scss',
})
export class WorkspacesStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);
  private fb = inject(FormBuilder);

  protected readonly areas = this.store.selectSignal(selectAreas);
  protected readonly allSections = this.store.selectSignal(selectSections);
  protected readonly workspaces = this.store.selectSignal(selectWorkspaces);

  protected readonly form = this.fb.nonNullable.group({
    areaId: [null as number | null, Validators.required],
    sectionId: [null as number | null, Validators.required],
  });

  protected readonly sectionsForArea = computed(() => {
    const areaId = this.form.controls.areaId.value;
    return areaId == null ? [] : this.allSections().filter(s => s.areaId === areaId);
  });

  protected readonly areaOptions = computed(() =>
    this.areas().map(a => ({ label: a.name, value: a.id }))
  );

  protected readonly sectionOptions = computed(() =>
    this.sectionsForArea().map(s => ({ label: s.name, value: s.id }))
  );

  ngOnInit() {
    this.store.dispatch(loadAreas());
    this.store.dispatch(loadSections({}));
    this.store.dispatch(loadWorkspaces({ branchId: this.branchId }));
  }

  add() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.areaId == null || v.sectionId == null) return;
    // Evitar duplicados (mismo area+section)
    const exists = this.workspaces().some(w => w.areaId === v.areaId && w.sectionId === v.sectionId);
    if (exists) return;
    const next: BranchWorkspaceCreateInput[] = [
      ...this.workspaces().map(w => ({ areaId: w.areaId, sectionId: w.sectionId })),
      { areaId: v.areaId, sectionId: v.sectionId },
    ];
    this.store.dispatch(syncWorkspaces({ branchId: this.branchId, workspaces: next }));
    this.form.reset({ areaId: v.areaId, sectionId: null });  // Mantengo area seleccionada para agregar más secciones rápido
  }

  remove(w: BranchWorkspace) {
    const next: BranchWorkspaceCreateInput[] = this.workspaces()
      .filter(x => x.id !== w.id)
      .map(x => ({ areaId: x.areaId, sectionId: x.sectionId }));
    this.store.dispatch(syncWorkspaces({ branchId: this.branchId, workspaces: next }));
  }

  areaName(areaId: number): string {
    return this.areas().find(a => a.id === areaId)?.name ?? `Área #${areaId}`;
  }

  sectionName(sectionId: number): string {
    return this.allSections().find(s => s.id === sectionId)?.name ?? `Sección #${sectionId}`;
  }
}
