import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PollingService } from '@core/refresh';
import { BranchOption } from '../../models/extraction.model';
import { EXTRACTION_FEATURE_KEY, initialExtractionState } from '../../store/extraction/extraction.state';
import { ExtractionQueuePage } from './extraction-queue.page';

describe('ExtractionQueuePage (smoke)', () => {
  let stopSpy: ReturnType<typeof vi.fn>;
  let setActiveSpy: ReturnType<typeof vi.fn>;

  function configure(partialState: Partial<typeof initialExtractionState> = {}): void {
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
          initialState: {
            [EXTRACTION_FEATURE_KEY]: { ...initialExtractionState, ...partialState },
          },
        }),
        { provide: PollingService, useValue: pollingMock },
      ],
    });
  }

  it('starts polling on init and stops on destroy', () => {
    configure();
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    const polling = TestBed.inject(PollingService);
    expect(polling.startPolling).toHaveBeenCalled();
    fixture.destroy();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('renders the page title', () => {
    configure();
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cola de extracción');
  });

  it('shows the "elegí una sucursal" empty state when there are branches but none selected', () => {
    const branches: BranchOption[] = [
      { id: 1, code: 'NORTE', name: 'Sucursal Norte' },
      { id: 2, code: 'SUR', name: 'Sucursal Sur' },
    ];
    configure({ branches, selectedBranchId: null });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Elegí una sucursal arriba para empezar');
  });

  it('shows the "no branches assigned" empty state when branches is empty', () => {
    configure({ branches: [], selectedBranchId: null });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tenés sucursales asignadas');
  });
});
