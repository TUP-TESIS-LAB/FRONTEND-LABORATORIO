import { TestBed } from '@angular/core/testing';
import { RowActionsMenuComponent, type RowMenuAction } from './row-actions-menu.component';

describe('RowActionsMenuComponent', () => {
  const actions: RowMenuAction[] = [
    { key: 'rejected', label: 'Rechazar', icon: 'pi-ban' },
    { key: 'lost', label: 'Perder', icon: 'pi-exclamation-triangle' },
  ];

  function setup() {
    TestBed.configureTestingModule({ imports: [RowActionsMenuComponent] });
    const fixture = TestBed.createComponent(RowActionsMenuComponent);
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el botón kebab', () => {
    const fixture = setup();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.querySelector('i.pi-ellipsis-v')).toBeTruthy();
  });

  it('mapea actions a MenuItem[] con command que emite accion', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance;
    const emitted: string[] = [];
    cmp.accion.subscribe((k) => emitted.push(k));

    const items = cmp.items();
    expect(items.length).toBe(2);
    expect(items[0].label).toBe('Rechazar');

    items[0].command!({} as never);
    items[1].command!({} as never);
    expect(emitted).toEqual(['rejected', 'lost']);
  });
});
