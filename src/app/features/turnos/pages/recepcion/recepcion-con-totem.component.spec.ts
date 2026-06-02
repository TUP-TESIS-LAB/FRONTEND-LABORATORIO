import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RecepcionConTotemComponent } from './recepcion-con-totem.component';
import { OperatorBranchContextService } from '../../services/operator-branch.context';
import { QueueStatus } from '../../models/queue-status.enum';

describe('RecepcionConTotemComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideMockStore({
          initialState: {
            queue: {
              entries: [
                { id: 1, publicCode: 'CT-0001', nationalId: '123', patientId: null, branchId: 1, appointmentId: 10, hasAppointment: true, status: QueueStatus.PENDING, lastCalledAt: null, callCount: 0, createdAt: '2026-06-02T09:00:00Z' },
                { id: 2, publicCode: 'ST-0001', nationalId: '', patientId: null, branchId: 1, appointmentId: null, hasAppointment: false, status: QueueStatus.PENDING, lastCalledAt: null, callCount: 0, createdAt: '2026-06-02T09:10:00Z' },
              ],
              loading: false, callingId: null, error: null,
            },
            appointments: { todayByBranch: [], loading: false, error: null },
          },
        }),
        {
          provide: OperatorBranchContextService,
          useValue: { branchId: signal<number | null>(1).asReadonly() },
        },
      ],
    });
  });

  it('renderiza una fila CT y una ST', () => {
    const fixture = TestBed.createComponent(RecepcionConTotemComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).toContain('CT-0001');
    expect(html).toContain('ST-0001');
  });

  it('aplica la clase row-st a la fila ST', () => {
    const fixture = TestBed.createComponent(RecepcionConTotemComponent);
    fixture.detectChanges();
    const stRow = fixture.nativeElement.querySelector('tr.row-st');
    expect(stRow).not.toBeNull();
    expect(stRow.textContent).toContain('ST-0001');
  });
});
