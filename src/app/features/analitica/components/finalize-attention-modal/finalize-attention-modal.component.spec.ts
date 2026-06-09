import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalizeAttentionModalComponent } from './finalize-attention-modal.component';

describe('FinalizeAttentionModalComponent', () => {
  let fixture: ComponentFixture<FinalizeAttentionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FinalizeAttentionModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(FinalizeAttentionModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('confirm emits confirmed', () => {
    let emitted = false;
    fixture.componentInstance.confirmed.subscribe(() => (emitted = true));
    fixture.componentInstance.confirm();
    expect(emitted).toBe(true);
  });

  it('onHide emits dismissed', () => {
    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));
    fixture.componentInstance.onHide();
    expect(dismissed).toBe(true);
  });
});
