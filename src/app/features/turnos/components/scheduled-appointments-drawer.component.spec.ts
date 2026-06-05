import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ScheduledAppointmentsDrawerComponent } from './scheduled-appointments-drawer.component';
import { OperatorBranchContextService } from '../services/operator-branch.context';
import { loadTodayAppointments } from '../store/appointments/appointments.actions';

describe('ScheduledAppointmentsDrawerComponent', () => {
  let store: MockStore;
  const branchSig = signal<number | null>(5);

  beforeEach(() => {
    branchSig.set(5);
    TestBed.configureTestingModule({
      providers: [
        provideAnimationsAsync(),
        provideMockStore({
          initialState: {
            appointments: { todayByBranch: [], loading: false, error: null },
            queue: { entries: [], loading: false, callingId: null, error: null },
          },
        }),
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: branchSig.asReadonly() },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('despacha loadTodayAppointments la primera vez que visible=true', () => {
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(store.dispatch).not.toHaveBeenCalled();

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).toHaveBeenCalledWith(loadTodayAppointments({ branchId: 5 }));
  });

  it('re-despacha cada vez que visible pasa de false a true (auto-refresh on open)', () => {
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).toHaveBeenCalledTimes(2);
  });

  it('no despacha si no hay branchId en el context', () => {
    branchSig.set(null);
    const fixture = TestBed.createComponent(ScheduledAppointmentsDrawerComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
