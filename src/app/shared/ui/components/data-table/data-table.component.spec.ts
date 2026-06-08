import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { DataTableComponent } from './data-table.component';
import { UiCellDirective } from './ui-cell.directive';
import { TableColumn, TableAction } from '@shared/ui/models/table-column.model';

const COLS: TableColumn[] = [
  { field: 'name', header: 'Nombre' },
  { field: 'type', header: 'Tipo' },
  { field: 'status', header: 'Estado' },
];

const ROWS = [
  { id: 1, name: 'Gómez, Laura', type: 'Nacional', status: 'Activo' },
  { id: 2, name: 'Pérez, Juan', type: 'Provincial', status: 'Inactivo' },
  { id: 3, name: 'Díaz, Marina', type: 'Nacional', status: 'Activo' },
];

// ── Host sin acciones ni custom cells ──────────────────────────────────────────
@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `<ui-table [columns]="cols" [value]="rows()" />`,
})
class BasicHostComponent {
  cols = COLS;
  rows = signal<unknown[]>(ROWS);
}

// ── Host con custom cell ────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [DataTableComponent, UiCellDirective],
  template: `
    <ui-table [columns]="cols" [value]="rows()">
      <ng-template uiCell="status" let-row>
        <span class="custom-status">{{ $any(row).status }}!</span>
      </ng-template>
    </ui-table>
  `,
})
class CustomCellHostComponent {
  cols = COLS;
  rows = signal<unknown[]>(ROWS);
}

// ── Host con acciones ──────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <ui-table
      [columns]="cols"
      [value]="rows()"
      [showView]="true"
      [showEdit]="true"
      [showDelete]="true"
      [actions]="extraActions"
      (view)="viewed = $event"
      (edit)="edited = $event"
      (rowDelete)="deleted = $event"
      (action)="lastAction = $event" />
  `,
})
class ActionsHostComponent {
  cols = COLS;
  rows = signal<unknown[]>(ROWS);
  viewed: unknown;
  edited: unknown;
  deleted: unknown;
  lastAction: { key: string; row: unknown } | undefined;
  readonly extraActions: TableAction[] = [
    { key: 'pdf', icon: 'pi-file-pdf', label: 'Ver PDF' },
  ];
}

// ── Host con lista vacía ───────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `<ui-table [columns]="cols" [value]="[]" emptyHeading="Sin resultados" emptyIcon="pi-inbox" />`,
})
class EmptyHostComponent {
  cols = COLS;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function setup<T>(HostComp: new () => T) {
  TestBed.configureTestingModule({ imports: [HostComp as any] });
  const fixture = TestBed.createComponent(HostComp as any);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance as T, el };
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('DataTableComponent', () => {

  describe('column headers', () => {
    it('renders one <th> per column', () => {
      const { el } = setup(BasicHostComponent);
      const headers = Array.from(el.querySelectorAll('thead th')).map((h) => h.textContent?.trim());
      expect(headers).toEqual(['Nombre', 'Tipo', 'Estado']);
    });
  });

  describe('cell values', () => {
    it('renders plain text for each cell', () => {
      const { el } = setup(BasicHostComponent);
      const html = el.innerHTML;
      expect(html).toContain('Gómez, Laura');
      expect(html).toContain('Nacional');
      expect(html).toContain('Inactivo');
    });
  });

  describe('custom cell templates', () => {
    it('uses uiCell template instead of plain text for the matching field', () => {
      const { el } = setup(CustomCellHostComponent);
      const custom = el.querySelectorAll('.custom-status');
      expect(custom.length).toBe(ROWS.length);
      expect(custom[0].textContent?.trim()).toBe('Activo!');
    });

    it('still renders plain text for columns without a custom template', () => {
      const { el } = setup(CustomCellHostComponent);
      expect(el.innerHTML).toContain('Gómez, Laura');
      expect(el.innerHTML).toContain('Nacional');
    });
  });

  describe('action buttons', () => {
    it('renders ver/editar/eliminar buttons when showView/Edit/Delete=true', () => {
      const { el } = setup(ActionsHostComponent);
      expect(el.querySelector('[aria-label="Ver"]')).toBeTruthy();
      expect(el.querySelector('[aria-label="Editar"]')).toBeTruthy();
      expect(el.querySelector('[aria-label="Eliminar"]')).toBeTruthy();
    });

    it('renders extra action buttons', () => {
      const { el } = setup(ActionsHostComponent);
      expect(el.querySelector('[aria-label="Ver PDF"]')).toBeTruthy();
    });

    it('does NOT render action buttons when all flags are false and no extras', () => {
      const { el } = setup(BasicHostComponent);
      expect(el.querySelector('[aria-label="Ver"]')).toBeNull();
      expect(el.querySelector('[aria-label="Editar"]')).toBeNull();
      expect(el.querySelector('[aria-label="Eliminar"]')).toBeNull();
    });
  });

  describe('output events', () => {
    it('emits view with the row when "Ver" is clicked', () => {
      const { el, host, fixture } = setup(ActionsHostComponent);
      const btn = el.querySelectorAll<HTMLButtonElement>('[aria-label="Ver"]')[0];
      btn.click();
      fixture.detectChanges();
      expect((host as ActionsHostComponent).viewed).toEqual(ROWS[0]);
    });

    it('emits edit with the row when "Editar" is clicked', () => {
      const { el, host, fixture } = setup(ActionsHostComponent);
      const btn = el.querySelectorAll<HTMLButtonElement>('[aria-label="Editar"]')[1];
      btn.click();
      fixture.detectChanges();
      expect((host as ActionsHostComponent).edited).toEqual(ROWS[1]);
    });

    it('emits delete with the row when "Eliminar" is clicked', () => {
      const { el, host, fixture } = setup(ActionsHostComponent);
      const btn = el.querySelectorAll<HTMLButtonElement>('[aria-label="Eliminar"]')[2];
      btn.click();
      fixture.detectChanges();
      expect((host as ActionsHostComponent).deleted).toEqual(ROWS[2]);
    });

    it('emits action with key + row when extra action is clicked', () => {
      const { el, host, fixture } = setup(ActionsHostComponent);
      const btn = el.querySelectorAll<HTMLButtonElement>('[aria-label="Ver PDF"]')[0];
      btn.click();
      fixture.detectChanges();
      expect((host as ActionsHostComponent).lastAction).toEqual({ key: 'pdf', row: ROWS[0] });
    });
  });

  describe('empty state', () => {
    it('shows the empty state heading when value is empty', () => {
      const { el } = setup(EmptyHostComponent);
      expect(el.innerHTML).toContain('Sin resultados');
    });

    it('does not render a <table> when value is empty', () => {
      const { el } = setup(EmptyHostComponent);
      expect(el.querySelector('table')).toBeNull();
    });
  });
});
