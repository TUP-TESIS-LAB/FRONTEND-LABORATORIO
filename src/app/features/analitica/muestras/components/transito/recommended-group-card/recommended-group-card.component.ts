// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; recommended-group-card.component.html and
// recommended-group-card.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup, SectionOption } from '../../../models/transito.model';
import { SIN_DESTINO_GROUP_ID } from '../../../models/transito.model';
import { SampleRowComponent } from '../sample-row/sample-row.component';
import type { RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';

@Component({
  selector: 'app-recommended-group-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  template: `
<article class="group-card" [class.outcome-here]="!isPendingDest" [class.outcome-pending]="isPendingDest">
  <header>
    <input type="checkbox" [checked]="allSelected" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del group">
    <div class="title">
      <span class="area">{{ title }}</span>
      <span class="sub">{{ subtitle }}</span>
    </div>
    <span class="badge" [class.green]="!isPendingDest" [class.amber]="isPendingDest">
      {{ isPendingDest ? 'Sin destino' : 'En proceso' }}
    </span>
    <span class="count">{{ group.sampleIds.length }} muestra{{ group.sampleIds.length === 1 ? '' : 's' }}</span>
    @if (!isSinDestino) {
      <button type="button" class="edit" (click)="toggleEditing.emit()">Editar destino</button>
    }
    <button type="button" class="send" [class.primary]="sendHighlighted" [disabled]="isPendingDest" (click)="send.emit()">{{ sendLabel }}</button>
  </header>

  @if (isEditing || isSinDestino) {
    <div class="dest-form">
      <select [value]="assignedSectionId ?? ''" (change)="onSectionChange($any($event.target).value)" aria-label="Sección de destino">
        <option value="" disabled>Sección…</option>
        @for (o of sectionOptions; track o.sectionId) { <option [value]="o.sectionId">{{ o.label }}</option> }
      </select>
    </div>
  }

  <div class="rows">
    @for (s of samples; track s.id) {
      <app-sample-row
        [sample]="s"
        [selected]="isSelected(s.id)"
        [flashing]="isFlashing(s.id)"
        [leaving]="isLeaving(s.id)"
        (toggle)="toggleSample.emit(s.id)"
        (rowAction)="rowAction.emit({ id: s.id, key: $event })"
      />
      @if (isSinDestino && reasonOf(s.id)) {
        <div class="row-reason"><i class="pi pi-info-circle"></i> {{ reasonOf(s.id) }}</div>
      }
    }
  </div>
</article>
  `,
  styleUrl: './recommended-group-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendedGroupCardComponent {
  @Input({ required: true }) group!: RecommendedGroup;
  @Input({ required: true }) samples!: Sample[];
  @Input({ required: true }) selectedIds!: ReadonlySet<string>;
  @Input({ required: true }) isEditing!: boolean;
  @Input({ required: true }) leavingIds!: ReadonlySet<string>;
  @Input({ required: true }) flashId!: string | null;
  /** Opciones de sección (workspaces reales de la sucursal) para asignación manual. */
  @Input() sectionOptions: SectionOption[] = [];
  /** Motivo por tubo (solo se renderiza en la variante "Sin destino"). */
  @Input() reasons: ReadonlyMap<string, string> = new Map();
  /** Sección efectiva del grupo (asignación manual o la implícita del routing). */
  @Input() assignedSectionId: number | null = null;

  readonly toggleSample = output<string>();
  readonly rowAction = output<{ id: string; key: RowActionKey }>();
  readonly toggleAll = output<boolean>();
  readonly toggleEditing = output<void>();
  readonly assignSection = output<number>();
  readonly send = output<void>();

  get isSinDestino(): boolean {
    return this.group.id === SIN_DESTINO_GROUP_ID;
  }

  /** Sin destino y todavía sin sección asignada manualmente. */
  get isPendingDest(): boolean {
    return this.isSinDestino && !this.group.section;
  }

  get title(): string {
    if (this.isPendingDest) return 'Sin destino';
    return this.group.area || this.group.section;
  }

  get subtitle(): string {
    if (this.isPendingDest) return 'Asignale una sección para poder despachar';
    return [this.group.branch, this.group.section].filter(Boolean).join(' · ');
  }

  get selectedInGroup(): number {
    return this.group.sampleIds.filter(id => this.selectedIds.has(id)).length;
  }

  get allSelected(): boolean {
    const ids = this.group.sampleIds;
    return ids.length > 0 && ids.every(id => this.selectedIds.has(id));
  }

  get sendLabel(): string {
    const n = this.selectedInGroup;
    return n > 0 ? `Enviar ${n} tildadas` : `Enviar ${this.group.sampleIds.length}`;
  }

  get sendHighlighted(): boolean {
    return this.selectedInGroup > 0;
  }

  isSelected(id: string): boolean { return this.selectedIds.has(id); }
  isFlashing(id: string): boolean { return this.flashId === id; }
  isLeaving(id: string): boolean { return this.leavingIds.has(id); }
  reasonOf(id: string): string | undefined { return this.reasons.get(id); }

  onAllToggle(ev: Event): void {
    this.toggleAll.emit((ev.target as HTMLInputElement).checked);
  }

  onSectionChange(value: string): void {
    const n = Number(value);
    if (value !== '' && Number.isFinite(n)) this.assignSection.emit(n);
  }
}
