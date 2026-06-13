import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import type { Analysis } from '@features/analitica/models/atencion.model';
import { selectTemplates } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { saveTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';

interface OrderedAnalysis { analysisTypeId: number; name: string; }

@Component({
  selector: 'app-worksheet-config-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="close()" [modal]="true" [draggable]="false" [style]="{ width: '720px' }"
              [header]="templateId() ? 'Modificar hoja de trabajo' : 'Nueva hoja de trabajo'">
      <div class="flex flex-col gap-3">
        <label class="text-xs font-semibold opacity-70">NOMBRE DE LA HOJA</label>
        <input class="w-full border rounded p-2 text-sm" [ngModel]="name()" (ngModelChange)="name.set($event)"
               placeholder="Ej.: Coagulación · Planilla B" />

        <label class="text-xs font-semibold opacity-70">BUSCAR ANÁLISIS</label>
        <input class="w-full border rounded p-2 text-sm" [ngModel]="query()" (ngModelChange)="onQuery($event)"
               placeholder="Buscar análisis…" />
        @if (results().length) {
          <div class="border rounded divide-y">
            @for (a of results(); track a.id) {
              <button type="button" class="w-full text-left p-2 text-sm hover:bg-gray-50 flex justify-between"
                      (click)="add(a)"><span>{{ a.name }}</span><i class="pi pi-plus"></i></button>
            }
          </div>
        }

        <label class="text-xs font-semibold opacity-70">ORDEN EN LA PLANILLA{{ ordered().length ? ' · ' + ordered().length : '' }}</label>
        <div class="flex flex-col gap-1">
          @for (a of ordered(); track a.analysisTypeId; let i = $index) {
            <div class="flex items-center gap-2 border rounded p-2 text-sm">
              <span class="opacity-50 w-6">{{ i + 1 }}</span>
              <span class="flex-1">{{ a.name }}</span>
              <button type="button" class="pi pi-chevron-up" [disabled]="i === 0" (click)="moveItem(i, -1)"></button>
              <button type="button" class="pi pi-chevron-down" [disabled]="i === ordered().length - 1" (click)="moveItem(i, 1)"></button>
              <button type="button" class="pi pi-times" (click)="removeAt(a.analysisTypeId)"></button>
            </div>
          }
          @if (!ordered().length) {
            <p class="text-sm opacity-60">Buscá y elegí análisis: definen qué aparece en la planilla.</p>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="close()" />
        <p-button label="Guardar hoja" [disabled]="!valid()" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class WorksheetConfigModalComponent {
  private readonly store = inject(Store);
  private readonly analysis = inject(AnalysisService);

  readonly visible = input<boolean>(false);
  readonly templateId = input<number | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly name = signal('');
  readonly query = signal('');
  readonly results = signal<Analysis[]>([]);
  readonly ordered = signal<OrderedAnalysis[]>([]);

  private readonly templates = this.store.selectSignal(selectTemplates);
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q.trim() ? this.analysis.searchByName(q.trim()) : of([])),
      takeUntilDestroyed(),
    ).subscribe(list => this.results.set(list));

    effect(() => {
      const id = this.templateId();
      if (!this.visible() || id == null) return;
      const tpl = this.templates().find(t => t.id === id);
      if (!tpl) return;
      this.name.set(tpl.name);
      const sorted = [...tpl.analyses].sort((a, b) => a.displayOrder - b.displayOrder);
      forkJoin(sorted.map(a => this.analysis.getById(a.analysisTypeId)))
        .subscribe(details => this.ordered.set(details.map(d => ({ analysisTypeId: d.id, name: d.name }))));
    });
  }

  readonly valid = computed(() => this.name().trim() !== '' && this.ordered().length > 0);

  onQuery(q: string): void { this.query.set(q); this.query$.next(q); }

  add(a: Analysis): void {
    if (this.ordered().some(x => x.analysisTypeId === a.id)) return;
    this.ordered.update(list => [...list, { analysisTypeId: a.id, name: a.name }]);
    this.query.set(''); this.results.set([]);
  }
  removeAt(id: number): void { this.ordered.update(list => list.filter(x => x.analysisTypeId !== id)); }
  moveItem(i: number, d: number): void {
    const j = i + d;
    const arr = [...this.ordered()];
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.ordered.set(arr);
  }

  save(): void {
    if (!this.valid()) return;
    this.store.dispatch(saveTemplate({
      id: this.templateId(),
      name: this.name().trim(),
      analyses: this.ordered().map((a, i) => ({ analysisTypeId: a.analysisTypeId, displayOrder: i })),
    }));
    this.reset();
    this.saved.emit();
  }
  close(): void { this.reset(); this.closed.emit(); }
  private reset(): void { this.name.set(''); this.query.set(''); this.results.set([]); this.ordered.set([]); }
}
