// src/app/features/saas-admin/pages/tenants-list/tenants-list.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { TenantsListPage } from './tenants-list.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenants, deactivateTenant, softDeleteTenant } from '../../store/saas-admin.actions';

describe('TenantsListPage', () => {
  const actions$ = new Subject();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantsListPage],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: {
              ...initialSaasAdminState,
              tenants: [
                { id: 1, code: 'a', name: 'A', status: 'ACTIVE',   active: true,  deletedAt: null },
                { id: 2, code: 'b', name: 'B', status: 'INACTIVE', active: true,  deletedAt: null },
              ],
            },
          },
        }),
        provideNoopAnimations(),
        provideRouter([]),
        ConfirmationService,
      ],
    });
  });

  it('dispatches loadTenants on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenants());
  });

  it('confirmDeactivate dispatches deactivateTenant when user accepts', () => {
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((o: any) => { o.accept?.(); return confirmSvc; });
    fixture.componentInstance.confirmDeactivate({ id: 1, code: 'a', name: 'A', status: 'ACTIVE', active: true, deletedAt: null });
    expect(dispatchSpy).toHaveBeenCalledWith(deactivateTenant({ id: 1 }));
  });

  it('confirmSoftDelete dispatches softDeleteTenant when user accepts', () => {
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const confirmSvc = fixture.debugElement.injector.get(ConfirmationService);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((o: any) => { o.accept?.(); return confirmSvc; });
    fixture.componentInstance.confirmSoftDelete({ id: 2, code: 'b', name: 'B', status: 'ACTIVE', active: true, deletedAt: null });
    expect(dispatchSpy).toHaveBeenCalledWith(softDeleteTenant({ id: 2 }));
  });
});
