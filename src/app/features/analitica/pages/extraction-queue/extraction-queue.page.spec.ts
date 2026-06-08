import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Store } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { PollingService } from '@core/refresh';
import { AwaitingExtractionItem, BranchOption } from '../../models/extraction.model';
import * as A from '../../store/extraction/extraction.actions';
import { EXTRACTION_FEATURE_KEY, initialExtractionState } from '../../store/extraction/extraction.state';
import { ExtractionQueuePage } from './extraction-queue.page';

function awaitingItem(over: Partial<AwaitingExtractionItem> = {}): AwaitingExtractionItem {
  return {
    id: 1,
    patientId: 10,
    patientFullName: 'Pérez, Ana',
    patientDni: '30111222',
    patientBirthDate: null,
    patientGender: null,
    attentionNumber: 'A-1',
    publicCode: null,
    isUrgent: false,
    analysisCount: 2,
    insurancePlanLabel: null,
    createdAt: new Date().toISOString(),
    waitMinutes: 5,
    samples: [],
    ...over,
  };
}

describe('ExtractionQueuePage (smoke)', () => {
  let stopSpy: ReturnType<typeof vi.fn>;
  let setActiveSpy: ReturnType<typeof vi.fn>;
  let store: MockStore;

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
    store = TestBed.inject(Store) as MockStore;
  }

  const branches: BranchOption[] = [
    { id: 1, code: 'NORTE', name: 'Sucursal Norte' },
    { id: 2, code: 'SUR', name: 'Sucursal Sur' },
  ];

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

  it('auto-seeds the branch from context and shows the columns when branches are available', () => {
    // Selector fue eliminado; la sucursal se siembra automáticamente desde el
    // contexto del operador (o la primera de la lista). Con branches presentes
    // el seed effect dispatchea setSelectedBranch y la UI muestra las columnas.
    configure({ branches, selectedBranchId: 1 });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.columns')).not.toBeNull();
  });

  it('shows the "no branches assigned" empty state when branches is empty', () => {
    configure({ branches: [], selectedBranchId: null });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tenés sucursales asignadas');
  });

  it('renders box-config-bar and the two columns when a branch is selected', () => {
    configure({ branches, selectedBranchId: 1 });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-box-config-bar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-in-progress-list')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.columns')).not.toBeNull();
  });

  it('onTake opens the take-patient modal with the selected patient', () => {
    configure({ branches, selectedBranchId: 1 });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    const patient = awaitingItem({ id: 42 });
    page.onTake(patient);

    expect(page.takeModalOpen()).toBe(true);
    expect(page.selectedPatient()).toEqual(patient);
  });

  it('modal assign dispatches assignExtractor and closes the modal', () => {
    configure({ branches, selectedBranchId: 1 });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    page.onTake(awaitingItem({ id: 42 }));
    page.onAssignToBox(3);

    expect(dispatchSpy).toHaveBeenCalledWith(
      A.assignExtractor({ id: 42, boxNumber: 3, branchId: 1 }),
    );
    expect(page.takeModalOpen()).toBe(false);
    expect(page.selectedPatient()).toBeNull();
  });

  it('onBoxAssign merges by boxNumber and dispatches saveBoxAssignments with the full list', () => {
    configure({
      branches,
      selectedBranchId: 1,
      boxAssignments: [
        { boxNumber: 1, extractorId: null, extractorFullName: null },
        { boxNumber: 2, extractorId: null, extractorFullName: null },
      ],
    });
    const fixture = TestBed.createComponent(ExtractionQueuePage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    page.onBoxAssign({ boxNumber: 2, extractorId: 99 });

    expect(dispatchSpy).toHaveBeenCalledWith(
      A.saveBoxAssignments({
        boxes: [
          { boxNumber: 1, extractorUserId: null },
          { boxNumber: 2, extractorUserId: 99 },
        ],
      }),
    );
  });

});
