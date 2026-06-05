import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BoxSelectorModalComponent } from './box-selector-modal.component';
import { BOX_OCCUPATION_FEATURE_KEY } from '../store/box-occupation.state';

describe('BoxSelectorModalComponent', () => {
  let fixture: ComponentFixture<BoxSelectorModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BoxSelectorModalComponent],
      providers: [
        provideAnimationsAsync(),
        provideMockStore({
          initialState: {
            [BOX_OCCUPATION_FEATURE_KEY]: {
              occupations: [
                { id: 1, branchId: 1001, userId: 10005, userName: 'Lucía', boxType: 'ATENCION', boxNumber: 2, occupiedAt: '' },
              ],
              loading: false, error: null,
            },
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(BoxSelectorModalComponent);
    fixture.componentRef.setInput('branchId', 1001);
    fixture.componentRef.setInput('totalBoxes', 4);
    fixture.componentRef.setInput('currentUserId', 10002);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('renders N slots', () => {
    const slots = fixture.nativeElement.querySelectorAll('.box-slot');
    expect(slots.length).toBe(4);
  });

  it('renders occupied slot with user name', () => {
    const occupiedSlot = fixture.nativeElement.querySelector('.box-slot--occupied');
    expect(occupiedSlot).not.toBeNull();
    expect(occupiedSlot.textContent).toContain('Lucía');
  });
});
