import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { SectionListItemWithCount } from '../../models/section-list-item.model';
import {
  loadSecciones, loadCountBySection, loadUnassignedCount,
} from '../../store/secciones/secciones.actions';
import {
  selectSeccionesConCount, selectUnassignedCount, selectPending,
} from '../../store/secciones/secciones.selectors';
import { SeccionesTableComponent } from './components/secciones-table.component';
import { SeccionFormDrawerComponent } from './components/seccion-form-drawer.component';

@Component({
  selector: 'emp-secciones-page',
  standalone: true,
  imports: [
    FormsModule, ButtonModule, InputTextModule,
    SeccionesTableComponent, SeccionFormDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <p class="lead">Las secciones son del laboratorio y se comparten entre sucursales. Definí los análisis una vez y asociá la sección donde haga falta.</p>
      <div class="stats">
        <div class="stat"><b>{{ secciones().length }}</b><span>Secciones</span></div>
        <div class="stat" [class.warn]="unassignedCount() > 0"><b>{{ unassignedCount() }}</b><span>Análisis sin sección</span></div>
        <div class="stat"><b>{{ unusedCount() }}</b><span>Sin uso</span></div>
      </div>
    </div>

    <div class="sec-toolbar">
      <span class="p-input-icon-left sec-search">
        <input pInputText type="text" placeholder="Buscar sección…"
               [ngModel]="query()" (ngModelChange)="query.set($event)" />
      </span>
      <p-button label="Nueva sección" icon="pi pi-plus" severity="primary"
                (onClick)="openCreate()" />
    </div>

    <emp-secciones-table
      [secciones]="filtered()"
      [loading]="pending()"
      (edit)="openEdit($event)" />

    <emp-seccion-form-drawer
      [visible]="drawerOpen()"
      [section]="editing()"
      [saving]="pending()"
      (cancel)="closeDrawer()" />
  `,
  styles: [`
    :host {
      --accent: #5b54e6; --orange: #e0820a; --muted: #8a90a3; --line: #eceef3;
      display: block;
    }
    .page-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 24px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .lead { font-size: 13.5px; color: var(--muted); max-width: 760px; line-height: 1.55; margin: 4px 0 0; }
    .stats { display: flex; gap: 10px; flex: none; }
    .stat {
      background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 10px 16px;
      text-align: center; min-width: 92px; box-shadow: 0 1px 2px #0b132a08;
    }
    .stat b { display: block; font-size: 22px; font-weight: 800; color: #1a2140; line-height: 1; }
    .stat span { font-size: 11px; color: var(--muted); }
    .stat.is-on { border-color: color-mix(in srgb, var(--accent) 45%, white); background: color-mix(in srgb, var(--accent) 7%, white); }
    .stat.is-on b { color: var(--accent); }
    .stat.warn { border-color: color-mix(in srgb, var(--orange) 45%, white); background: color-mix(in srgb, var(--orange) 8%, white); }
    .stat.warn b { color: var(--orange); }
    .sec-toolbar {
      display: flex; gap: var(--space-3); align-items: center;
      justify-content: space-between; margin-bottom: var(--space-4);
    }
    .sec-search input { min-width: 260px; }
  `],
})
export class SeccionesPage implements OnInit {
  private readonly store = inject(Store);

  readonly secciones = this.store.selectSignal(selectSeccionesConCount);
  readonly unassignedCount = this.store.selectSignal(selectUnassignedCount);
  readonly pending = this.store.selectSignal(selectPending);

  readonly query = signal('');
  readonly drawerOpen = signal(false);
  readonly editing = signal<SectionListItemWithCount | null>(null);

  readonly unusedCount = computed(
    () => this.secciones().filter((s) => s.branches.length === 0).length,
  );

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.secciones();
    return this.secciones().filter((s) => s.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.store.dispatch(loadSecciones());
    this.store.dispatch(loadCountBySection());
    this.store.dispatch(loadUnassignedCount());
  }

  openCreate(): void {
    this.editing.set(null);
    this.drawerOpen.set(true);
  }

  openEdit(section: SectionListItemWithCount): void {
    this.editing.set(section);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.editing.set(null);
  }
}
