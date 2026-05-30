import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ObrasSocialesListPage } from './obras-sociales-list.page';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from '../../store/obra-social.state';
import { setObraSocialPageRequest, loadObraSocialCatalogs } from '../../store/obra-social.actions';

describe('ObrasSocialesListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ObrasSocialesListPage],
      providers: [
        provideMockStore({ initialState: { [OBRA_SOCIAL_FEATURE_KEY]: initialObraSocialState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('despacha loadObraSocialCatalogs en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(ObrasSocialesListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadObraSocialCatalogs());
  });

  it('setState despacha setObraSocialPageRequest con state y page=0', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.setState('inactive');
    expect(spy).toHaveBeenCalledWith(setObraSocialPageRequest({ patch: { state: 'inactive', page: 0 } }));
  });

  it('onPage mapea first/rows a page/size', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onPage({ first: 40, rows: 20 });
    expect(spy).toHaveBeenCalledWith(setObraSocialPageRequest({ patch: { page: 2, size: 20 } }));
  });

  it('renderiza routerLink a /obras-sociales/nueva', () => {
    const fixture = TestBed.createComponent(ObrasSocialesListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/href="[^"]*\/obras-sociales\/nueva"/);
  });

  it('carga la lista en init: el p-table lazy dispara setObraSocialPageRequest', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(ObrasSocialesListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(
      setObraSocialPageRequest({ patch: { page: 0, size: initialObraSocialState.pageRequest.size } }),
    );
  });
});
