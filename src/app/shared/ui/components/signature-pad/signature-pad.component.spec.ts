import { TestBed } from '@angular/core/testing';
import { SignaturePadComponent } from './signature-pad.component';

describe('SignaturePadComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SignaturePadComponent] });
  });

  it('starts empty', () => {
    const fixture = TestBed.createComponent(SignaturePadComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.empty()).toBe(true);
  });

  it('writeValue(null) keeps the pad empty', () => {
    const fixture = TestBed.createComponent(SignaturePadComponent);
    fixture.detectChanges();
    fixture.componentInstance.writeValue(null);
    expect(fixture.componentInstance.empty()).toBe(true);
  });

  it('clear() emits null through the value accessor and stays empty', () => {
    const fixture = TestBed.createComponent(SignaturePadComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    let emitted: string | null | undefined;
    cmp.registerOnChange((v) => (emitted = v));
    cmp.clear();
    expect(emitted).toBeNull();
    expect(cmp.empty()).toBe(true);
  });

  it('setDisabledState toggles the disabled signal', () => {
    const fixture = TestBed.createComponent(SignaturePadComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.setDisabledState(true);
    expect(cmp.disabled()).toBe(true);
  });
});
