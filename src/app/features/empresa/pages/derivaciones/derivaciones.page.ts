import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';

import { ExternalLab, ExternalLabState } from '../../models/external-lab.model';
import { enter, setState } from '../../store/derivaciones/derivaciones.actions';
import { selectLabs, selectState, selectPending } from '../../store/derivaciones/derivaciones.selectors';
import { DerivacionesTableComponent } from './components/derivaciones-table.component';

interface StateOption { label: string; value: ExternalLabState; }

@Component({
  selector: 'emp-derivaciones-page',
  standalone: true,
  imports: [
    FormsModule, ButtonModule, InputTextModule, SelectButtonModule,
    DerivacionesTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <p class="lead">Los laboratorios derivados son los terciarizados a los que la empresa envía muestras. Definí sus datos, responsable y contactos para gestionar las derivaciones.</p>
      <div class="stats">
        <div class="stat"><b>{{ derivadosCount() }}</b><span>Derivados</span></div>
        <div class="stat"><b>{{ contactosCount() }}</b><span>Contactos</span></div>
        <div class="stat" [class.warn]="bajaCount() > 0"><b>{{ bajaCount() }}</b><span>De baja</span></div>
      </div>
    </div>

    <div class="der-toolbar">
      <span class="p-input-icon-left der-search">
        <input pInputText type="text" placeholder="Buscar laboratorio…"
               [ngModel]="query()" (ngModelChange)="query.set($event)" />
      </span>
      <p-selectButton [options]="stateOptions" optionLabel="label" optionValue="value"
                      [allowEmpty]="false"
                      [ngModel]="state()" (ngModelChange)="onStateChange($event)" />
      <p-button label="Nuevo derivado" icon="pi pi-plus" severity="primary"
                (onClick)="openNuevo()" />
    </div>

    <emp-derivaciones-table
      [labs]="filtered()"
      [loading]="pending()"
      (edit)="openEdit($event)" />
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
    .stat.warn { border-color: color-mix(in srgb, var(--orange) 45%, white); background: color-mix(in srgb, var(--orange) 8%, white); }
    .stat.warn b { color: var(--orange); }
    .der-toolbar {
      display: flex; gap: var(--space-3); align-items: center;
      justify-content: space-between; margin-bottom: var(--space-4);
    }
    .der-search input { min-width: 260px; }
  `],
})
export class DerivacionesPage implements OnInit {
  private readonly store = inject(Store);

  readonly labs = this.store.selectSignal(selectLabs);
  readonly state = this.store.selectSignal(selectState);
  readonly pending = this.store.selectSignal(selectPending);

  readonly query = signal('');

  readonly stateOptions: StateOption[] = [
    { label: 'Activados', value: 'active' },
    { label: 'Desactivados', value: 'inactive' },
  ];

  readonly derivadosCount = computed(() => this.labs().filter((l) => l.active).length);
  readonly contactosCount = computed(
    () => this.labs().filter((l) => l.active).reduce((acc, l) => acc + l.contacts.length, 0),
  );
  readonly bajaCount = computed(() => this.labs().filter((l) => !l.active).length);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.labs();
    return this.labs().filter((l) =>
      [l.name, l.taxId, l.address?.city, l.responsibleName]
        .filter((v): v is string => !!v)
        .some((v) => v.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.store.dispatch(enter());
  }

  onStateChange(value: ExternalLabState): void {
    this.store.dispatch(setState({ state: value }));
  }

  // Handlers del drawer (D5): por ahora placeholders — D5 los completa.
  openNuevo(): void {
    // TODO(D5): abrir drawer de alta.
  }

  openEdit(_lab: ExternalLab): void {
    // TODO(D5): abrir drawer de edición con _lab.
  }
}
