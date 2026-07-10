import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { StatCardComponent } from '@shared/ui/components/stat-card/stat-card.component';
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
    StatCardComponent, SeccionesTableComponent, SeccionFormDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sec-stats">
      <ui-stat-card label="Secciones" [value]="secciones().length" icon="pi-sitemap" />
      <ui-stat-card label="Análisis sin sección" [value]="unassignedCount()"
                    icon="pi-inbox" accentColor="var(--ds-warning, #c2410c)" />
      <ui-stat-card label="Secciones sin uso" [value]="unusedCount()" icon="pi-ban" />
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
    :host { display: block; }
    .sec-stats { display: flex; gap: var(--space-4); margin-bottom: var(--space-5); flex-wrap: wrap; }
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
