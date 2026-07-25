import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AnalysisService } from '@features/analitica/services/analysis.service';
import { AnalysisChip } from '../../../models/analysis-chip.model';
import { SectionListItemWithCount } from '../../../models/section-list-item.model';
import { addSeccion, updateSeccion, deleteSeccion } from '../../../store/secciones/secciones.actions';
import { AnalysisChipsEditorComponent } from './analysis-chips-editor.component';

/**
 * Drawer de alta/edición de una sección + gestión de sus análisis (KAN-218).
 * Dispatchea directo al store (add/update/delete): la mutación de la sección y sus
 * análisis es un flujo cohesivo (nombre + chips + impacto), no hay lógica de página que
 * lo intermedie. En editar, carga los chips iniciales vía `sectionAnalyses(id)`.
 */
@Component({
  selector: 'emp-seccion-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, TagModule,
    ConfirmDialogModule, AnalysisChipsEditorComponent,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-confirmDialog />
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      [header]="editing() ? 'Editar sección' : 'Nueva sección'">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Datos de la sección</span></div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="name" class="pat-form__input" maxlength="80" />
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header"><span>Análisis</span></div>
            <emp-analysis-chips-editor [(value)]="chips" />
          </section>

          @if (editing()) {
            <section class="pat-form__card">
              <div class="pat-form__card-header"><span>Sucursales que la usan</span></div>
              @if (branches().length) {
                <div class="sfd-branches">
                  @for (b of branches(); track b.id) {
                    <p-tag [value]="b.code" severity="secondary" [rounded]="true" />
                  }
                </div>
                <p class="sfd-impact">
                  La usan {{ branches().length }} sucursales; los cambios les llegan automáticamente.
                </p>
              } @else {
                <p class="sfd-impact">Ninguna sucursal usa esta sección todavía.</p>
              }
            </section>
          }
        </div>

        <div class="pat-form__footer">
          @if (editing()) {
            <p-button label="Eliminar" severity="danger" text type="button"
                      (onClick)="onDelete()" />
          }
          <span style="flex:1"></span>
          <p-button label="Cancelar" severity="secondary" text type="button"
                    (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar cambios' : 'Crear sección'"
            severity="primary"
            type="submit"
            [disabled]="!canSubmit() || saving"
            [loading]="saving" />
        </div>
      </form>
    </p-drawer>
  `,
  styles: [`
    .sfd-branches { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--space-2); }
    .sfd-impact { font-size: 12px; color: var(--ds-text-muted); margin: 0; }
  `],
})
export class SeccionFormDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly analysisService = inject(AnalysisService);
  private readonly confirm = inject(ConfirmationService);

  @Input() visible = false;
  @Input() section: SectionListItemWithCount | null = null;
  @Input() saving = false;

  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;
  readonly editing = signal(false);
  readonly chips = signal<AnalysisChip[]>([]);
  readonly branches = computed(() => this.section?.branches ?? []);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');

  private wasVisible = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('section' in changes || 'visible' in changes) {
      this.editing.set(!!this.section);
    }
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) {
        this.chips.set([]);
        if (this.section) {
          this.form.reset({ name: this.section.name });
          this.loadChips(this.section.id);
        } else {
          this.form.reset({ name: '' });
        }
      }
      this.wasVisible = this.visible;
    }
  }

  /** Carga los análisis actuales de la sección como chips `found` para poblar el editor. */
  private loadChips(sectionId: number): void {
    this.analysisService.sectionAnalyses(sectionId).subscribe({
      next: (list) => {
        // Descartar si el drawer se cerró o cambió de sección mientras cargaba.
        if (!this.visible || this.section?.id !== sectionId) return;
        this.chips.set(
          list.map((a) => ({ analysisId: a.analysisId, name: a.name, state: 'found' as const })),
        );
      },
    });
  }

  private analysisIds(): number[] {
    return this.chips()
      .filter((c) => c.state === 'found' && c.analysisId != null)
      .map((c) => c.analysisId as number);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const name = this.form.getRawValue().name.trim();
    const analysisIds = this.analysisIds();
    if (this.section) {
      this.store.dispatch(updateSeccion({ id: this.section.id, name, analysisIds }));
    } else {
      this.store.dispatch(addSeccion({ name, analysisIds }));
    }
    this.cancel.emit();
  }

  onDelete(): void {
    const section = this.section;
    if (!section) return;
    const count = this.branches().length;
    const message = count > 0
      ? `⚠️ La usan ${count} sucursales y dejarán de tenerla disponible. ¿Borrar igual?`
      : `¿Eliminar la sección "${section.name}"? Se conservará el histórico.`;
    this.confirm.confirm({
      header: 'Eliminar sección',
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.store.dispatch(deleteSeccion({ id: section.id }));
        this.cancel.emit();
      },
    });
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }
}
