import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Action } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { TenantModulesTabComponent } from './tenant-modules-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { toggleTenantModule, toggleTenantModuleFailure } from '../../../store/saas-admin.actions';
import { ACTIVABLE_MODULES } from '../../../models/module-code';

describe('TenantModulesTabComponent', () => {
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    TestBed.configureTestingModule({
      imports: [TenantModulesTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: { ...initialSaasAdminState, selectedTenantModules: ['PORTAL'] },
          },
        }),
        provideMockActions(() => actions$),
        provideNoopAnimations(),
      ],
    });
  });

  it('shows the 6 activable modules and reflects the enabled set', () => {
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    expect(ACTIVABLE_MODULES).toHaveLength(6);
    expect(fixture.componentInstance.isEnabled('PORTAL')).toBe(true);
    expect(fixture.componentInstance.isEnabled('TURNOS')).toBe(false);
  });

  it('toggle dispatches toggleTenantModule with the requested enable value', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    fixture.componentInstance.onToggle('TURNOS', true);
    expect(spy).toHaveBeenCalledWith(toggleTenantModule({ tenantId: 1, code: 'TURNOS', enable: true }));
  });

  it('bumps resetToken on toggleTenantModuleFailure so the switch re-syncs after a rejected toggle', () => {
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    const before = (fixture.componentInstance as any).resetToken();
    actions$.next(toggleTenantModuleFailure({ error: {} as any }));
    expect((fixture.componentInstance as any).resetToken()).toBe(before + 1);
  });
});
