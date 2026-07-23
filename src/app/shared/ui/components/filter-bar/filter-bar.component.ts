import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// ── Public types ─────────────────────────────────────────────────────────────

export interface FilterOption {
  value: unknown;
  label: string;
  /** Color del dot en chips y dropdown (CSS color string). */
  color?: string;
}

export interface FilterSelect {
  /** Clave que identifica este filtro en el valor emitido. */
  key: string;
  /** Título del grupo en el panel. */
  label: string;
  options: FilterOption[];
}

export interface FilterBarConfig {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
}

export interface FilterBarValue {
  search: string;
  /** key → array de valores seleccionados */
  [key: string]: unknown;
}

// ── Internal ─────────────────────────────────────────────────────────────────

interface ActiveChip {
  id: string;
  label: string;
  color?: string;
  remove: () => void;
}

@Component({
  selector: 'ui-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <!-- Row 1: search + filtros button -->
    <div class="fb-row">
      <div class="fb-search">
        <i class="pi pi-search fb-search__icon"></i>
        <input
          class="fb-search__input"
          type="text"
          [placeholder]="config().searchPlaceholder ?? 'Buscar…'"
          [ngModel]="search()"
          (ngModelChange)="onSearch($event)" />
        @if (search()) {
          <button class="fb-search__clear" type="button" (click)="onSearch('')">
            <i class="pi pi-times"></i>
          </button>
        }
      </div>

      @if (config().selects?.length) {
        <button
          class="fb-filter-btn"
          [class.fb-filter-btn--active]="hasFilters()"
          type="button"
          (click)="togglePanel($event)">
          Filtros
          @if (selectCount() > 0) {
            <span class="fb-filter-btn__badge">{{ selectCount() }}</span>
          }
          <i class="pi pi-chevron-{{ panelOpen() ? 'up' : 'down' }} fb-filter-btn__chevron"></i>
        </button>

        <!-- Dropdown panel -->
        @if (panelOpen()) {
          <div class="fb-panel" (click)="$event.stopPropagation()">
            @for (sel of config().selects; track sel.key) {
              <div class="fb-panel__group">
                <div class="fb-panel__group-title">{{ sel.label }}</div>
                @for (opt of sel.options; track opt.value) {
                  <label
                    class="fb-panel__opt"
                    [class.fb-panel__opt--selected]="isSelected(sel.key, opt.value)">
                    <input
                      type="checkbox"
                      [checked]="isSelected(sel.key, opt.value)"
                      (change)="toggleOption(sel.key, opt.value)" />
                    @if (opt.color) {
                      <span class="fb-dot" [style.background]="opt.color"></span>
                    }
                    {{ opt.label }}
                  </label>
                }
              </div>
              @if (!$last) { <div class="fb-panel__divider"></div> }
            }
            <div class="fb-panel__footer">
              <button class="fb-panel__clear" type="button" (click)="clearAll()">
                Limpiar filtros
              </button>
              <button class="fb-panel__apply" type="button" (click)="panelOpen.set(false)">
                Aplicar
              </button>
            </div>
          </div>
        }
      }
    </div>

    <!-- Row 2: chips de filtros activos -->
    @if (chips().length) {
      <div class="fb-chips">
        @for (chip of chips(); track chip.id) {
          <span class="fb-chip">
            @if (chip.color) {
              <span class="fb-dot" [style.background]="chip.color"></span>
            }
            {{ chip.label }}
            <button class="fb-chip__x" type="button" (click)="chip.remove()">
              <i class="pi pi-times"></i>
            </button>
          </span>
        }
        <button class="fb-chips__clear-all" type="button" (click)="clearAll()">
          Limpiar todo
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; }

    /* ── Row 1 ── */
    .fb-row {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    /* Search */
    .fb-search {
      flex: 1;
      position: relative;
    }
    .fb-search__icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: #94a3b8; font-size: 13px; pointer-events: none;
    }
    .fb-search__input {
      width: 100%;
      padding: 9px 36px 9px 36px;
      border: 1px solid #e8edf3;
      border-radius: 8px;
      font-size: 14px;
      color: #1a1a2e;
      background: #fff;
      outline: none;
      transition: border-color 120ms;
    }
    .fb-search__input:focus { border-color: #2563eb; }
    .fb-search__input::placeholder { color: #94a3b8; }
    .fb-search__clear {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; color: #94a3b8;
      font-size: 11px; cursor: pointer; padding: 4px; border-radius: 4px;
      display: inline-flex; align-items: center;
      transition: color 100ms;
    }
    .fb-search__clear:hover { color: #64748b; }

    /* Filtros button */
    .fb-filter-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      border: 1px solid #e8edf3; border-radius: 8px;
      background: #fff; font-size: 13px; color: #64748b;
      cursor: pointer; white-space: nowrap;
      transition: all 120ms;
    }
    .fb-filter-btn:hover { border-color: #94a3b8; color: #1a1a2e; }
    .fb-filter-btn--active {
      border-color: #2563eb;
      background: #2563eb;
      color: #fff;
    }
    .fb-filter-btn--active:hover { background: #1d4ed8; border-color: #1d4ed8; }
    .fb-filter-btn__badge {
      background: rgba(255,255,255,.25);
      border-radius: 10px; font-size: 10px; font-weight: 700;
      padding: 1px 6px; line-height: 1.4;
    }
    .fb-filter-btn:not(.fb-filter-btn--active) .fb-filter-btn__badge {
      background: #2563eb; color: #fff;
    }
    .fb-filter-btn__chevron { font-size: 10px; }

    /* Dropdown panel */
    .fb-panel {
      position: absolute;
      top: calc(100% + 6px); right: 0; z-index: 100;
      background: #fff;
      border: 1px solid #e8edf3;
      border-radius: 10px;
      box-shadow: 0 8px 28px rgba(0,0,0,.10);
      min-width: 220px; max-width: 320px;
      padding: 6px 0;
    }
    .fb-panel__group { padding: 6px 0; }
    .fb-panel__group-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
      font-weight: 700; color: #94a3b8;
      padding: 4px 14px 6px;
    }
    .fb-panel__opt {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px; font-size: 13px; cursor: pointer;
      transition: background 100ms; color: #1a1a2e;
    }
    .fb-panel__opt:hover { background: #f8fafc; }
    .fb-panel__opt--selected { background: #eff6ff; color: #2563eb; font-weight: 500; }
    .fb-panel__opt--selected:hover { background: #dbeafe; }
    .fb-panel__opt input[type=checkbox] { accent-color: #2563eb; cursor: pointer; flex-shrink: 0; }
    .fb-panel__divider { height: 1px; background: #f1f5f9; margin: 2px 0; }
    .fb-panel__footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px 4px;
      border-top: 1px solid #f1f5f9; margin-top: 2px;
    }
    .fb-panel__clear {
      border: none; background: transparent; font-size: 12px;
      color: #94a3b8; cursor: pointer; text-decoration: underline;
      padding: 4px;
    }
    .fb-panel__clear:hover { color: #64748b; }
    .fb-panel__apply {
      padding: 5px 14px;
      background: #2563eb; color: #fff; border: none;
      border-radius: 6px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: background 100ms;
    }
    .fb-panel__apply:hover { background: #1d4ed8; }

    /* ── Row 2 — chips ── */
    .fb-chips {
      display: flex; align-items: center; gap: 6px;
      flex-wrap: wrap; margin-top: 8px;
    }
    .fb-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 6px;
      font-size: 12px; font-weight: 500;
      background: #f1f5f9; color: #475569;
      border: 1px solid #e2e8f0;
    }
    .fb-chip__x {
      border: none; background: transparent; color: #94a3b8;
      font-size: 10px; cursor: pointer; padding: 0 1px;
      display: inline-flex; align-items: center;
      transition: color 100ms;
    }
    .fb-chip__x:hover { color: #475569; }
    .fb-chips__clear-all {
      border: none; background: transparent;
      font-size: 12px; color: #94a3b8; cursor: pointer;
      text-decoration: underline; padding: 2px 4px;
      transition: color 100ms;
    }
    .fb-chips__clear-all:hover { color: #64748b; }

    /* ── Shared dot ── */
    .fb-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
  `],
})
export class FilterBarComponent {
  readonly config = input.required<FilterBarConfig>();
  /**
   * Opcional: cuando este valor cambia de identidad, resetea búsqueda/selección/panel.
   * Pensado para consumidores que reusan la misma instancia del componente para
   * "entidades" distintas (ej. `ReportFiltersComponent` al navegar entre reportes, donde
   * Angular reutiliza la instancia porque el `@if` del padre sigue siendo truthy). Los
   * consumidores que no lo pasan no ven ningún cambio de comportamiento.
   */
  readonly resetKey = input<unknown>(undefined);
  readonly valueChange = output<FilterBarValue>();

  protected readonly search    = signal('');
  protected readonly selected  = signal<Record<string, unknown[]>>({});
  protected readonly panelOpen = signal(false);

  private readonly elRef = inject(ElementRef);

  constructor() {
    effect(() => {
      this.resetKey(); // trackea el cambio
      untracked(() => {
        this.search.set('');
        this.selected.set({});
        this.panelOpen.set(false);
      });
    });
  }

  protected readonly chips = computed<ActiveChip[]>(() => {
    const result: ActiveChip[] = [];

    if (this.search().trim()) {
      result.push({
        id: '__search',
        label: `"${this.search().trim()}"`,
        remove: () => this.onSearch(''),
      });
    }

    const sel = this.selected();
    for (const group of this.config().selects ?? []) {
      for (const v of (sel[group.key] ?? [])) {
        const opt = group.options.find(o => o.value === v);
        result.push({
          id: `${group.key}__${String(v)}`,
          label: opt?.label ?? String(v),
          color: opt?.color,
          remove: () => this.toggleOption(group.key, v),
        });
      }
    }

    return result;
  });

  protected readonly hasFilters  = computed(() => this.chips().length > 0);
  protected readonly selectCount = computed(() =>
    Object.values(this.selected()).reduce((n, arr) => n + arr.length, 0),
  );

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.panelOpen.set(false);
    }
  }

  protected togglePanel(e: MouseEvent): void {
    e.stopPropagation();
    this.panelOpen.update(v => !v);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.emit();
  }

  protected isSelected(key: string, value: unknown): boolean {
    return (this.selected()[key] ?? []).includes(value);
  }

  protected toggleOption(key: string, value: unknown): void {
    this.selected.update(m => {
      const current = [...(m[key] ?? [])];
      const idx = current.indexOf(value);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(value);
      return { ...m, [key]: current };
    });
    this.emit();
  }

  protected clearAll(): void {
    this.search.set('');
    this.selected.set({});
    this.panelOpen.set(false);
    this.emit();
  }

  private emit(): void {
    const value: FilterBarValue = { search: this.search() };
    for (const [key, vals] of Object.entries(this.selected())) {
      value[key] = vals;
    }
    this.valueChange.emit(value);
  }
}
