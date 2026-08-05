import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { AccessSection, SectionResponse } from '@core/access/access.model';
import { GROUPED_SECTIONS, SECTION_GROUPS } from '../models/access-section-groups';

interface RenderRow { code: AccessSection; label: string; }
interface RenderGroup { label: string; rows: RenderRow[]; }

@Component({
  selector: 'rp-secciones-checklist',
  standalone: true,
  imports: [FormsModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groups().length === 0) {
      <div class="ui-empty-state">
        <i class="pi pi-shield"></i>
        <h4>Sin secciones disponibles</h4>
        <p>Este tenant no tiene módulos activos para conceder.</p>
      </div>
    } @else {
      <div class="rp-groups">
        @for (g of groups(); track g.label) {
          <section class="rp-group">
            <h4 class="rp-group__title">{{ g.label }}</h4>
            <div class="rp-group__items">
              @for (row of g.rows; track row.code) {
                <label class="rp-check">
                  <p-checkbox
                    [binary]="true"
                    [disabled]="disabled"
                    [ngModel]="isChecked(row.code)"
                    (ngModelChange)="toggle.emit(row.code)" />
                  <span>{{ row.label }}</span>
                </label>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [`
    /* Grilla: los grupos (folders del sidebar) en columnas para ocupar menos alto. */
    .rp-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4) var(--space-6); align-items: start; }
    .rp-group { margin-bottom: 0; }
    .rp-group__title { margin: 0 0 var(--space-2); font-size: 13px; color: var(--ds-text-muted); }
    .rp-group__items { display: flex; flex-direction: column; gap: var(--space-2); }
    .rp-check { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .ui-empty-state { padding: var(--space-8); text-align: center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class SeccionesChecklistComponent {
  private readonly _catalog = signal<SectionResponse[]>([]);
  private readonly _working = signal<AccessSection[]>([]);

  @Input({ required: true }) set catalog(value: SectionResponse[]) { this._catalog.set(value ?? []); }
  @Input({ required: true }) set workingSet(value: AccessSection[]) { this._working.set(value ?? []); }
  @Input() disabled = false;

  @Output() toggle = new EventEmitter<AccessSection>();

  readonly groups = computed<RenderGroup[]>(() => {
    const byCode = new Map(this._catalog().map((s) => [s.code, s.label]));
    const grouped = SECTION_GROUPS
      .map((g) => ({
        label: g.label,
        rows: g.sections.filter((c) => byCode.has(c)).map((c) => ({ code: c, label: byCode.get(c)! })),
      }))
      .filter((g) => g.rows.length > 0);

    // El backend es la fuente de verdad de qué se puede conceder. Si agrega una
    // sección que todavía no está en SECTION_GROUPS, va a "Otros" en vez de
    // desaparecer: una sección invisible es un permiso que nadie puede otorgar.
    const rest = this._catalog()
      .filter((s) => !GROUPED_SECTIONS.has(s.code))
      .map((s) => ({ code: s.code, label: s.label }));

    return rest.length ? [...grouped, { label: 'Otros', rows: rest }] : grouped;
  });

  isChecked(code: AccessSection): boolean {
    return this._working().includes(code);
  }
}
