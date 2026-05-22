import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttentionTicketModalComponent } from './attention-ticket-modal.component';

describe('AttentionTicketModalComponent', () => {
  let fixture: ComponentFixture<AttentionTicketModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AttentionTicketModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(AttentionTicketModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('confirmWithTicket emits confirmed=true', () => {
    let payload: boolean | undefined;
    fixture.componentInstance.confirmed.subscribe((v) => (payload = v));
    fixture.componentInstance.confirmWithTicket();
    expect(payload).toBe(true);
  });

  it('confirmWithoutTicket emits confirmed=false', () => {
    let payload: boolean | undefined;
    fixture.componentInstance.confirmed.subscribe((v) => (payload = v));
    fixture.componentInstance.confirmWithoutTicket();
    expect(payload).toBe(false);
  });

  it('onHide emits dismissed', () => {
    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));
    fixture.componentInstance.onHide();
    expect(dismissed).toBe(true);
  });
});
