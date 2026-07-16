import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, it, expect } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DataTableComponent } from './data-table.component';
import { UiCellDirective } from './ui-cell.directive';
import { UiRowExpansionDirective } from './ui-row-expansion.directive';
import { TableColumn } from '@shared/ui/models/table-column.model';

interface Row { id: number; name: string; detail: string; }

@Component({
  standalone: true,
  imports: [DataTableComponent, UiCellDirective, UiRowExpansionDirective],
  template: `
    <ui-table [value]="rows" [columns]="cols" [expandable]="expandable">
      <ng-template uiRowExpansion let-row>
        <div class="exp-content">Detalle: {{ row.detail }}</div>
      </ng-template>
    </ui-table>
  `,
})
class HostCmp {
  expandable = true;
  cols: TableColumn[] = [{ field: 'name', header: 'Nombre' }];
  rows: Row[] = [
    { id: 1, name: 'Uno', detail: 'detalle-uno' },
    { id: 2, name: 'Dos', detail: 'detalle-dos' },
  ];
}

function setup(expandable = true) {
  TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(HostCmp);
  fx.componentInstance.expandable = expandable;
  fx.detectChanges();
  return fx;
}

describe('DataTableComponent — expandable rows', () => {
  it('renderiza una columna expander con un toggle (chevron) por fila cuando expandable=true', () => {
    const fx = setup(true);
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('th.ut-expander-th')).not.toBeNull();
    const togglers = el.querySelectorAll('td.ut-expander-td button');
    expect(togglers.length).toBe(2); // una por fila
    expect(el.querySelector('td.ut-expander-td .pi-chevron-right')).not.toBeNull();
  });

  it('no agrega la columna expander cuando expandable=false', () => {
    const fx = setup(false);
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('th.ut-expander-th')).toBeNull();
    expect(el.querySelector('td.ut-expander-td')).toBeNull();
  });

  it('al clickear el toggle expande la fila y muestra el template [uiRowExpansion]', async () => {
    const fx = setup(true);
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('.exp-content')).toBeNull(); // colapsada por defecto

    const firstToggler = el.querySelector('td.ut-expander-td button') as HTMLButtonElement;
    firstToggler.click();
    fx.detectChanges();
    await fx.whenStable();
    fx.detectChanges();

    const content = el.querySelector('.exp-content');
    expect(content).not.toBeNull();
    expect(content!.textContent).toContain('detalle-uno');
  });
});
