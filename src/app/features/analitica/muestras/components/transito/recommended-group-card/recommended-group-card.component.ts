// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; recommended-group-card.component.html and
// recommended-group-card.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { RecommendedGroup, TransitoDest } from '../../../models/transito.model';
import { BRANCHES, AREAS, SECTIONS, CURRENT_BRANCH } from '../../../data/catalogs';
import { SampleRowComponent } from '../sample-row/sample-row.component';

@Component({
  selector: 'app-recommended-group-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  template: `
<article class="group-card" [class.outcome-here]="outcome === 'en-proceso'" [class.outcome-other]="outcome === 'en-transito'">
  <header>
    <input type="checkbox" [checked]="allSelected" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del group">
    <i class="pi" [class.pi-inbox]="outcome === 'en-proceso'" [class.pi-truck]="outcome === 'en-transito'"></i>
    <div class="title">
      <span class="area">{{ group.area }}</span>
      <span class="sub"><i class="pi pi-map-marker"></i> {{ group.branch }} · {{ group.section }}</span>
    </div>
    <span class="badge" [class.green]="outcome === 'en-proceso'" [class.blue]="outcome === 'en-transito'">
      {{ outcome === 'en-proceso' ? 'En proceso' : 'En tránsito' }}
    </span>
    <span class="count">{{ group.sampleIds.length }} muestra{{ group.sampleIds.length === 1 ? '' : 's' }}</span>
    <button type="button" class="edit" (click)="toggleEditing.emit()">Editar destino</button>
    <button type="button" class="send" [class.primary]="sendHighlighted" (click)="send.emit()">{{ sendLabel }}</button>
  </header>

  @if (isEditing) {
    <div class="dest-form">
      <select [value]="group.branch" (change)="onDestField('branch', $any($event.target).value)">
        @for (b of branches; track b) { <option [value]="b">{{ b }}</option> }
      </select>
      <select [value]="group.area" (change)="onDestField('area', $any($event.target).value)">
        @for (a of areas; track a) { <option [value]="a">{{ a }}</option> }
      </select>
      <select [value]="group.section" (change)="onDestField('section', $any($event.target).value)">
        @for (s of sections; track s) { <option [value]="s">{{ s }}</option> }
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
      />
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

  readonly toggleSample = output<string>();
  readonly toggleAll = output<boolean>();
  readonly toggleEditing = output<void>();
  readonly destChange = output<Partial<TransitoDest>>();
  readonly send = output<void>();

  protected readonly branches = BRANCHES;
  protected readonly areas = AREAS;
  protected readonly sections = SECTIONS;

  get outcome(): 'en-proceso' | 'en-transito' {
    return this.group.branch === CURRENT_BRANCH ? 'en-proceso' : 'en-transito';
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

  onAllToggle(ev: Event): void {
    this.toggleAll.emit((ev.target as HTMLInputElement).checked);
  }

  onDestField(field: 'branch' | 'area' | 'section', value: string): void {
    this.destChange.emit({ [field]: value });
  }
}
