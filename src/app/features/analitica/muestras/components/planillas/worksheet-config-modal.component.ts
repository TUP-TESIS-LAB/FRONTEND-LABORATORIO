import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, forkJoin, catchError } from 'rxjs';
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
  imports: [FormsModule, DialogModule],
  templateUrl: './worksheet-config-modal.component.html',
  styleUrl: './worksheet-config-modal.component.scss',
})
export class WorksheetConfigModalComponent {
  private readonly store = inject(Store);
  private readonly analysis = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

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
        .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of([])))
        .subscribe(details => this.ordered.set(details.map(d => ({ analysisTypeId: d.id, name: d.name }))));
    });
  }

  readonly valid = computed(() => this.name().trim() !== '' && this.ordered().length > 0);

  pad(n: number): string { return String(n).padStart(2, '0'); }
  onQuery(q: string): void { this.query.set(q); this.query$.next(q); if (q.trim() === '') this.results.set([]); }

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
