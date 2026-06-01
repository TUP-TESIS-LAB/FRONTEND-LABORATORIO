import { TestBed } from '@angular/core/testing';
import { TotemNumpadComponent } from './totem-numpad.component';

describe('TotemNumpadComponent', () => {
  let fixture: any;
  let component: TotemNumpadComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TotemNumpadComponent] });
    fixture = TestBed.createComponent(TotemNumpadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits digitPressed with the clicked digit', () => {
    let emitted: number | null = null;
    component.digitPressed.subscribe((d: number) => emitted = d);
    fixture.nativeElement.querySelector('[data-digit="5"]').click();
    expect(emitted).toBe(5);
  });

  it('emits clearPressed when clear button is clicked', () => {
    let cleared = false;
    component.clearPressed.subscribe(() => cleared = true);
    fixture.nativeElement.querySelector('[data-action="clear"]').click();
    expect(cleared).toBe(true);
  });

  it('emits submitPressed when submit button is clicked', () => {
    let submitted = false;
    component.submitPressed.subscribe(() => submitted = true);
    fixture.nativeElement.querySelector('[data-action="submit"]').click();
    expect(submitted).toBe(true);
  });

  it('disables submit when submitDisabled input is true', () => {
    fixture.componentRef.setInput('submitDisabled', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-action="submit"]');
    expect(btn.disabled).toBe(true);
  });
});
