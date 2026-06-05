import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BranchOption } from '../../models/extraction.model';
import { BranchSelectorChipComponent } from './branch-selector-chip.component';

function branch(over: Partial<BranchOption> = {}): BranchOption {
  return { id: 1, code: 'NORTE', name: 'Sucursal Norte', ...over };
}

describe('BranchSelectorChipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations()],
    });
  });

  it('renders the selected branch name', () => {
    const fixture = TestBed.createComponent(BranchSelectorChipComponent);
    fixture.componentRef.setInput('selected', branch({ name: 'Sucursal Centro' }));
    fixture.componentRef.setInput('options', [branch(), branch({ id: 2, name: 'Sucursal Centro' })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sucursal Centro');
  });

  it('disables the chip when there is only one option (no caret)', () => {
    const fixture = TestBed.createComponent(BranchSelectorChipComponent);
    fixture.componentRef.setInput('selected', branch());
    fixture.componentRef.setInput('options', [branch()]);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.branch-chip');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.caret')).toBeNull();
  });

  it('shows "Elegí una sucursal" when nothing selected but options exist', () => {
    const fixture = TestBed.createComponent(BranchSelectorChipComponent);
    fixture.componentRef.setInput('selected', null);
    fixture.componentRef.setInput('options', [branch(), branch({ id: 2 })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Elegí una sucursal');
  });

  it('shows "Sin sucursal" when there are no options', () => {
    const fixture = TestBed.createComponent(BranchSelectorChipComponent);
    fixture.componentRef.setInput('selected', null);
    fixture.componentRef.setInput('options', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin sucursal');
  });

  it('builds menu items that emit selectBranch on command', () => {
    const fixture = TestBed.createComponent(BranchSelectorChipComponent);
    const branches = [branch({ id: 1 }), branch({ id: 2, name: 'Sucursal Sur' })];
    fixture.componentRef.setInput('selected', branches[0]);
    fixture.componentRef.setInput('options', branches);
    fixture.detectChanges();

    const emissions: BranchOption[] = [];
    fixture.componentInstance.selectBranch.subscribe((b) => emissions.push(b));

    const items = fixture.componentInstance.menuItems();
    items[1].command!({} as never);
    expect(emissions).toEqual([branches[1]]);
  });
});
