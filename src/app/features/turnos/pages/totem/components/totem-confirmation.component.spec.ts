import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { TotemConfirmationComponent } from './totem-confirmation.component';
import { selectLastQueueNumber } from '../../../store/totem/totem.selectors';

describe('TotemConfirmationComponent', () => {
  let fixture: any;
  let component: TotemConfirmationComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TotemConfirmationComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectLastQueueNumber, value: 'ST-0001' }],
        }),
      ],
    });
    fixture = TestBed.createComponent(TotemConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the call number from the store', () => {
    const queueNumberEl: HTMLElement = fixture.nativeElement.querySelector('.queue-number');
    expect(queueNumberEl.textContent?.trim()).toBe('ST-0001');
  });

  it('shows the generic heading ¡Listo! without any patient name', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent?.trim()).toBe('¡Listo!');
  });

  it('does not contain any patient name greeting (no Bienvenido + name binding)', () => {
    const text: string = fixture.nativeElement.textContent ?? '';
    // The old copy had "¡Bienvenido!" — must be gone.
    expect(text).not.toContain('Bienvenido');
    // There is no patient-name binding, so the content is purely generic.
    expect(text).toContain('número de llamado');
  });
});
