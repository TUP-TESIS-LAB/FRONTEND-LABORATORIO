// WORKAROUND: Using @Input() decorator instead of input.required() signals because
// Angular 21's input.required() throws NG0303/NG0950 when used with setInput() in vitest
// (the angularTemplateInliner plugin does not fully resolve this for templateUrl components).
// Template and styles are inlined here for the same reason; lote-card.component.html and
// lote-card.component.scss are kept as separate files for reference by other tasks.
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Sample } from '../../../models/sample.model';
import type { LoteDestPatch, SectionOption, TemporalLote } from '../../../models/transito.model';
import { SampleRowComponent } from '../sample-row/sample-row.component';
import type { RowAction, RowActionKey } from '../../../models/transition.model';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [FormsModule, SampleRowComponent],
  template: `
<article class="lote-card" [class.no-dest]="!hasDest">
  <header>
    <input type="checkbox" [checked]="allSelected" (change)="onAllToggle($event)" aria-label="Tildar todas las muestras del lote">
    <div class="title">
      <span class="name">Lote {{ number }}</span>
      <span class="tag">TEMPORAL</span>
    </div>
    <div class="meta">
      @if (hasDest) {
        <span class="dest">{{ destLabel }}</span>
        <span class="badge" [class.green]="outcome === 'en-proceso'" [class.blue]="outcome === 'en-transito'">
          {{ outcome === 'en-proceso' ? 'En proceso' : 'En tránsito' }}
        </span>
      } @else {
        <span class="warn"><i class="pi pi-exclamation-triangle"></i> Sin destino — asignalo para poder enviar</span>
      }
      <span class="count">{{ lote.sampleIds.length }} muestras</span>
    </div>
    <button type="button" class="scan-here" [class.is-active]="isActive" [attr.aria-pressed]="isActive" (click)="setActive.emit()">
      {{ isActive ? 'Escaneo acá' : 'Escanear acá' }}
    </button>
    <button type="button" class="dissolve" (click)="dissolve.emit()" aria-label="Descartar lote"><i class="pi pi-times"></i></button>
  </header>

  <div class="dest-form">
    <select [value]="lote.branch" (change)="onBranchChange($any($event.target).value)" aria-label="Sucursal de destino">
      <option value="">Sucursal…</option>
      @for (b of branchOptions; track b.id) { <option [value]="b.name">{{ b.name }}</option> }
    </select>
    @if (isHere) {
      <select [value]="lote.sectionId ?? ''" (change)="onSectionChange($any($event.target).value)" aria-label="Sección de destino">
        <option value="">Sección…</option>
        @for (o of sectionOptions; track o.sectionId) { <option [value]="o.sectionId">{{ o.label }}</option> }
      </select>
    } @else {
      <input type="text" class="obs" placeholder="Observaciones (opcional)" [disabled]="!lote.branch"
             [value]="lote.observation ?? ''" (change)="onObservationChange($any($event.target).value)"
             aria-label="Observaciones (opcional)">
    }
    <button type="button" class="send" [disabled]="!hasDest" (click)="send.emit()">{{ sendLabel }}</button>
  </div>

  <div class="rows">
    @for (s of samples; track s.id) {
      <app-sample-row
        [sample]="s"
        [selected]="isSelected(s.id)"
        [flashing]="isFlashing(s.id)"
        [leaving]="isLeaving(s.id)"
        [rowActions]="rowActions"
        (toggle)="toggleSample.emit(s.id)"
        (rowAction)="rowAction.emit({ id: s.id, key: $event })"
      />
    }
  </div>
</article>
  `,
  styleUrl: './lote-card.component.scss',
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
  /** Acciones del kebab ya filtradas por módulo (bajan de la page hacia sample-row). */
  @Input() rowActions: RowAction[] | null = null;
  /** Sucursales reales del operador (destinos posibles). */
  @Input() branchOptions: { id: number; name: string }[] = [];
  /** Workspaces reales de la sucursal actual (para despacho local). */
  @Input() sectionOptions: SectionOption[] = [];
  /** Nombre de la sucursal actual (decide despacho vs derivación). */
  @Input() currentBranchName = '';

  readonly toggleSample = output<string>();
  readonly rowAction = output<{ id: string; key: RowActionKey }>();
  readonly toggleAll = output<boolean>();
  readonly destChange = output<LoteDestPatch>();
  readonly setActive = output<void>();
  readonly dissolve = output<void>();
  readonly send = output<void>();

  /** Destino en la sucursal actual → despacho a sección; otra sucursal → derivación. */
  get isHere(): boolean {
    return this.lote.branch === '' || this.lote.branch === this.currentBranchName;
  }

  get hasDest(): boolean {
    if (!this.lote.branch) return false;
    return this.lote.branch === this.currentBranchName
      ? this.lote.sectionId != null
      : this.lote.destinationBranchId != null;
  }

  get outcome(): 'en-proceso' | 'en-transito' {
    return this.lote.branch === this.currentBranchName ? 'en-proceso' : 'en-transito';
  }

  get destLabel(): string {
    return [this.lote.branch, this.lote.area, this.lote.section].filter(Boolean).join(' · ');
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

  onBranchChange(name: string): void {
    const branch = this.branchOptions.find(b => b.name === name) ?? null;
    this.destChange.emit({
      branch: name,
      destinationBranchId: branch?.id ?? null,
      sectionId: null,
      area: '',
      section: '',
    });
  }

  onSectionChange(value: string): void {
    if (value === '') {
      this.destChange.emit({ sectionId: null, area: '', section: '' });
      return;
    }
    const sectionId = Number(value);
    const opt = this.sectionOptions.find(o => o.sectionId === sectionId) ?? null;
    this.destChange.emit({
      sectionId,
      area: opt?.areaName ?? '',
      section: opt?.sectionName ?? `Sección ${sectionId}`,
    });
  }

  onObservationChange(value: string): void {
    this.destChange.emit({ observation: value });
  }
}
