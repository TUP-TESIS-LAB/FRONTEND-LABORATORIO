import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PollingService } from '@core/refresh';
import { EXTRACTION_FEATURE_KEY, initialExtractionState } from '../../store/extraction/extraction.state';
import { ExtractionQueuePage } from './extraction-queue.page';

describe('ExtractionQueuePage (smoke)', () => {
  let stopSpy: ReturnType<typeof vi.fn>;
  let setActiveSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stopSpy = vi.fn();
    setActiveSpy = vi.fn();
    const pollingMock: Partial<PollingService> = {
      startPolling: vi.fn().mockReturnValue({
        stop: stopSpy,
        pokeNow: vi.fn(),
        setActive: setActiveSpy,
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: { [EXTRACTION_FEATURE_KEY]: initialExtractionState },
        }),
        { provide: PollingService, useValue: pollingMock },
      ],
    });
  });

  it('starts polling on init and stops on destroy', () => {
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    const polling = TestBed.inject(PollingService);
    expect(polling.startPolling).toHaveBeenCalled();
    fixture.destroy();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('renders the page title', () => {
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cola de extracción');
  });
});
