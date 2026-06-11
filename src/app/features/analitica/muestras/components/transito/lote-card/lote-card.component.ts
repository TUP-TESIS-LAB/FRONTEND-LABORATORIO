// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; lote-card.component.html and
// lote-card.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { TemporalLote, TransitoDest } from '../../../models/transito.model';
import { BRANCHES, AREAS, SECTIONS, CURRENT_BRANCH } from '../../../data/catalogs';
import { SampleRowComponent } from '../sample-row/sample-row.component';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  template: `
<article class="lote-card" [class.no-dest]="!hasDest">
  <header>
    <input type="checkbox" [checked]="allSelected" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del lote">
    <i class="pi pi-objects-column"></i>
    <div class="title">
      <span class="name">Lote {{ number }}</span>
      <span class="tag">TEMPORAL</span>
    </div>
    <div class="meta">
      @if (hasDest) {
        <span class="dest"><i class="pi pi-map-marker"></i> {{ lote.branch }} · {{ lote.area }} · {{ lote.section }}</span>
        <span class="badge" [class.green]="outcome === 'en-proceso'" [class.blue]="outcome === 'en-transito'">
          {{ outcome === 'en-proceso' ? 'En proceso' : 'En tránsito' }}
        </span>
      } @else {
        <span class="warn"><i class="pi pi-exclamation-triangle"></i> Sin destino — asignalo para poder enviar</span>
      }
      <span class="count">{{ lote.sampleIds.length }} muestras</span>
    </div>
    <button type="button" class="scan-here" [class.is-active]="isActive" [attr.aria-pressed]="isActive" (click)="setActive.emit()">
      {{ isActive ? 'Escaneo → acá' : 'Escanear acá' }}
    </button>
    <button type="button" class="dissolve" (click)="dissolve.emit()" aria-label="Descartar lote">✕</button>
  </header>

  <div class="dest-form">
    <select [value]="lote.branch" (change)="onDestField('branch', $any($event.target).value)">
      <option value="">Sucursal…</option>
      @for (b of branches; track b) { <option [value]="b">{{ b }}</option> }
    </select>
    <select [value]="lote.area" (change)="onDestField('area', $any($event.target).value)">
      <option value="">Área…</option>
      @for (a of areas; track a) { <option [value]="a">{{ a }}</option> }
    </select>
    <select [value]="lote.section" (change)="onDestField('section', $any($event.target).value)">
      <option value="">Sección…</option>
      @for (s of sections; track s) { <option [value]="s">{{ s }}</option> }
    </select>
    <button type="button" class="send" [disabled]="!hasDest" (click)="send.emit()">{{ sendLabel }}</button>
  </div>

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
  styles: [''],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoteCardComponent {
  @Input({ required: true }) lote!: TemporalLote;
  @Input({ required: true }) number!: number;
  @Input({ required: true }) samples!: Sample[];
  @Input({ required: true }) selectedIds!: ReadonlySet<string>;
  @Input({ required: true }) isActive!: boolean;
  @Input({ required: true }) leavingIds!: ReadonlySet<string>;
  @Input({ required: true }) flashId!: string | null;

  readonly toggleSample = output<string>();
  readonly toggleAll = output<boolean>();
  readonly destChange = output<Partial<TransitoDest>>();
  readonly setActive = output<void>();
  readonly dissolve = output<void>();
  readonly send = output<void>();

  protected readonly branches = BRANCHES;
  protected readonly areas = AREAS;
  protected readonly sections = SECTIONS;

  get hasDest(): boolean {
    return !!(this.lote.branch && this.lote.area && this.lote.section);
  }

  get outcome(): 'en-proceso' | 'en-transito' {
    return this.lote.branch === CURRENT_BRANCH ? 'en-proceso' : 'en-transito';
  }

  get selectedInLote(): number {
    return this.lote.sampleIds.filter(id => this.selectedIds.has(id)).length;
  }

  get allSelected(): boolean {
    const ids = this.lote.sampleIds;
    return ids.length > 0 && ids.every(id => this.selectedIds.has(id));
  }

  get sendLabel(): string {
    const n = this.selectedInLote;
    return n > 0 ? `Enviar ${n} tildadas` : `Enviar ${this.lote.sampleIds.length}`;
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
