import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NotificationService } from '@core/services/notification.service';
import { TakePatientDrawerComponent } from './take-patient-drawer.component';
import { AwaitingExtractionItem } from '../../models/extraction.model';

function sample(): AwaitingExtractionItem {
  return {
    id: 1, patientId: 10, patientFullName: 'Ana',
    patientDni: '111', patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', isUrgent: false, analysisCount: 2,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0, samples: [],
  };
}

describe('TakePatientDrawerComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideNoopAnimations(), NotificationService],
    });
  });

  it('reads box from localStorage on construction', () => {
    window.localStorage.setItem('extractor.box', '5');
    const fixture = TestBed.createComponent(TakePatientDrawerComponent);
    expect(fixture.componentInstance.boxValue()).toBe(5);
  });

  it('canConfirm requires an integer >= 1', () => {
    const fixture = TestBed.createComponent(TakePatientDrawerComponent);
    const c = fixture.componentInstance;
    c.boxValue.set(null);
    expect(c.canConfirm()).toBe(false);
    c.boxValue.set(0);
    expect(c.canConfirm()).toBe(false);
    c.boxValue.set(3);
    expect(c.canConfirm()).toBe(true);
  });

  it('onConfirm persists box to localStorage and emits payload', () => {
    const fixture = TestBed.createComponent(TakePatientDrawerComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('patient', sample());
    c.boxValue.set(7);

    let emitted: { id: number; box: number } | undefined;
    c.confirm.subscribe((p) => (emitted = p));
    c.onConfirm();

    expect(window.localStorage.getItem('extractor.box')).toBe('7');
    expect(emitted).toEqual({ id: 1, box: 7 });
  });

  it('onConfirm with invalid box shows error toast and does NOT emit', () => {
    const fixture = TestBed.createComponent(TakePatientDrawerComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('patient', sample());
    c.boxValue.set(null);

    const notifier = TestBed.inject(NotificationService);
    const spy = vi.spyOn(notifier, 'error');
    let emitted = false;
    c.confirm.subscribe(() => (emitted = true));
    c.onConfirm();

    expect(spy).toHaveBeenCalled();
    expect(emitted).toBe(false);
  });

  it('onCancel closes the drawer (visible=false)', () => {
    const fixture = TestBed.createComponent(TakePatientDrawerComponent);
    const c = fixture.componentInstance;
    c.visible.set(true);
    c.onCancel();
    expect(c.visible()).toBe(false);
  });
});
