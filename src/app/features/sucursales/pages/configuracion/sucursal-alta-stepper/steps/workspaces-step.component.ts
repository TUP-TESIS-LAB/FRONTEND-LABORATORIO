import {
  ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit,
  computed, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';

import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { UiRowExpansionDirective } from '@shared/ui/components/data-table/ui-row-expansion.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';

import {
  selectAreas, selectSections, selectWorkspaces,
} from '../../../../store/sucursal.selectors';
import {
  addArea, addAreaSuccess,
  loadAreas, loadSections, loadWorkspaces, syncWorkspaces,
} from '../../../../store/sucursal.actions';
import { BranchWorkspaceCreateInput } from '../../../../models/branch-workspace.model';

interface AreaGroup {
  areaId: number;
  areaName: string;
  sectionCount: number;
  sections: { workspaceId: number; sectionId: number; sectionName: string }[];
}

/**
 * Paso "Áreas y secciones" — Mockup A: panel de asociación inline.
 * Elegís un área (o la creás en un modal), tildás sus secciones de la checklist (o creás una
 * nueva en otro modal) y "Agregar al listado" las suma. Abajo, una tabla genérica plegable
 * agrupa por área y al expandir muestra las secciones asociadas.
 */
@Component({
  selector: 'app-workspaces-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, ButtonModule, SelectModule, CheckboxModule, InputTextModule, DialogModule,
    DataTableComponent, UiCellDirective, UiRowExpansionDirective,
  ],
  templateUrl: './workspaces-step.component.html',
  styleUrl: './workspaces-step.component.scss',
})
export class WorkspacesStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly areas = this.store.selectSignal(selectAreas);
  protected readonly allSections = this.store.selectSignal(selectSections);
  protected readonly workspaces = this.store.selectSignal(selectWorkspaces);

  // Estado del panel de asociación.
  protected readonly selectedAreaId = signal<number | null>(null);
  protected readonly selectedSectionIds = signal<ReadonlySet<number>>(new Set());

  protected readonly areaOptions = computed(() =>
    this.areas().map((a) => ({ label: a.name, value: a.id })),
  );
  /** Todas las secciones del tenant (la checklist). Una sección ya no pertenece a un área. */
  protected readonly sectionsForArea = computed(() => this.allSections());
  protected readonly canAdd = computed(() =>
    this.selectedAreaId() != null && this.selectedSectionIds().size > 0,
  );

  /** Workspaces agrupados por área para la tabla plegable. */
  protected readonly areaGroups = computed<AreaGroup[]>(() => {
    const byArea = new Map<number, AreaGroup>();
    for (const w of this.workspaces()) {
      let g = byArea.get(w.areaId);
      if (!g) {
        g = { areaId: w.areaId, areaName: this.areaName(w.areaId), sectionCount: 0, sections: [] };
        byArea.set(w.areaId, g);
      }
      g.sections.push({ workspaceId: w.id, sectionId: w.sectionId, sectionName: this.sectionName(w.sectionId) });
    }
    return [...byArea.values()].map((g) => ({ ...g, sectionCount: g.sections.length }));
  });

  readonly groupColumns: readonly TableColumn[] = [
    { field: 'areaName',     header: 'Área' },
    { field: 'sectionCount', header: 'Secciones', align: 'center' },
  ];
  readonly groupActions: readonly TableAction[] = [
    { key: 'removeArea', icon: 'pi-trash', label: 'Quitar área', severity: 'danger' },
  ];

  // ── Modales de alta ──
  protected readonly areaModalOpen = signal(false);
  protected newAreaName = '';

  constructor() {
    // Al crear un área nueva la dejamos seleccionada (y limpiamos la checklist).
    this.actions$.pipe(ofType(addAreaSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ area }) => {
        this.selectedAreaId.set(area.id);
        this.selectedSectionIds.set(new Set());
        this.areaModalOpen.set(false);
        this.newAreaName = '';
      });
  }

  ngOnInit(): void {
    this.store.dispatch(loadAreas());
    this.store.dispatch(loadSections());
    this.store.dispatch(loadWorkspaces({ branchId: this.branchId }));
  }

  onAreaChange(): void {
    // Cambiar de área reinicia la selección de secciones (cascada).
    this.selectedSectionIds.set(new Set());
  }

  toggleSection(sectionId: number, checked: boolean): void {
    this.selectedSectionIds.update((s) => {
      const next = new Set(s);
      if (checked) next.add(sectionId); else next.delete(sectionId);
      return next;
    });
  }

  isTicked(sectionId: number): boolean {
    return this.selectedSectionIds().has(sectionId);
  }

  /** Agrega al listado las secciones tildadas del área elegida (las que falten). */
  add(): void {
    const areaId = this.selectedAreaId();
    const ticks = [...this.selectedSectionIds()];
    if (areaId == null || ticks.length === 0) return;
    const existing: BranchWorkspaceCreateInput[] =
      this.workspaces().map((w) => ({ areaId: w.areaId, sectionId: w.sectionId }));
    const toAdd = ticks
      .filter((sid) => !existing.some((e) => e.areaId === areaId && e.sectionId === sid))
      .map((sid) => ({ areaId, sectionId: sid }));
    if (toAdd.length === 0) return;
    this.store.dispatch(syncWorkspaces({ branchId: this.branchId, workspaces: [...existing, ...toAdd] }));
    this.selectedSectionIds.set(new Set()); // mantiene el área para seguir cargando
  }

  /** Quita todas las secciones asociadas de un área. */
  removeArea(areaId: number): void {
    const next = this.workspaces()
      .filter((w) => w.areaId !== areaId)
      .map((w) => ({ areaId: w.areaId, sectionId: w.sectionId }));
    this.store.dispatch(syncWorkspaces({ branchId: this.branchId, workspaces: next }));
  }

  /** Quita una sección puntual del listado. */
  removeSection(workspaceId: number): void {
    const next = this.workspaces()
      .filter((w) => w.id !== workspaceId)
      .map((w) => ({ areaId: w.areaId, sectionId: w.sectionId }));
    this.store.dispatch(syncWorkspaces({ branchId: this.branchId, workspaces: next }));
  }

  onGroupAction(ev: { key: string; row: unknown }): void {
    if (ev.key === 'removeArea') this.removeArea((ev.row as AreaGroup).areaId);
  }

  // ── Modales ──
  openAreaModal(): void {
    this.newAreaName = '';
    this.areaModalOpen.set(true);
  }
  saveArea(): void {
    const name = this.newAreaName.trim();
    if (!name) return;
    // El tipo de área no se pide en el stepper: se crea como OTRO (etiqueta neutra, sin
    // conducta en runtime). El catálogo de áreas sigue ofreciendo el resto de los tipos.
    this.store.dispatch(addArea({ input: {
      name,
      areaType: 'OTRO',
      externalLabName: null,
    } }));
  }

  areaName(areaId: number): string {
    return this.areas().find((a) => a.id === areaId)?.name ?? `Área #${areaId}`;
  }
  sectionName(sectionId: number): string {
    return this.allSections().find((s) => s.id === sectionId)?.name ?? `Sección #${sectionId}`;
  }
}
