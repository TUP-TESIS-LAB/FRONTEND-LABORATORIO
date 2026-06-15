import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';

import { TotemStepComponent } from './totem-step.component';
import { selectTotemConfig, selectCurrentSucursal } from '../../../../store/sucursal.selectors';
import { upsertTotemConfig } from '../../../../store/sucursal.actions';

function setup(totem: unknown) {
  TestBed.configureTestingModule({
    providers: [
      provideNoopAnimations(),
      provideMockActions(() => EMPTY),
      MessageService,
      provideMockStore({
        selectors: [
          { selector: selectTotemConfig, value: totem },
          { selector: selectCurrentSucursal, value: null },
        ],
      }),
    ],
  });
  const fx = TestBed.createComponent(TotemStepComponent);
  fx.componentRef.setInput('branchId', 7);
  const cmp = fx.componentInstance as TotemStepComponent;
  const store = TestBed.inject(MockStore);
  return { cmp, store };
}

describe('TotemStepComponent — toggles de pantallas', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('upsert({ atencionDisplayEnabled }) preserva enabled y extraccion del config actual', () => {
    const { cmp, store } = setup({
      branchId: 7, enabled: true, active: true,
      atencionDisplayEnabled: false, extraccionDisplayEnabled: true,
    });
    const spy = vi.spyOn(store, 'dispatch');
    (cmp as any).upsert({ atencionDisplayEnabled: true });
    expect(spy).toHaveBeenCalledWith(upsertTotemConfig({
      branchId: 7, enabled: true, atencionDisplayEnabled: true, extraccionDisplayEnabled: true,
    }));
  });

  it('onToggle(false) apaga el tótem y preserva los flags de pantallas', () => {
    const { cmp, store } = setup({
      branchId: 7, enabled: true, active: true,
      atencionDisplayEnabled: true, extraccionDisplayEnabled: false,
    });
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onToggle(false);
    expect(spy).toHaveBeenCalledWith(upsertTotemConfig({
      branchId: 7, enabled: false, atencionDisplayEnabled: true, extraccionDisplayEnabled: false,
    }));
  });

  it('sin config (null) los flags caen a false', () => {
    const { cmp, store } = setup(null);
    const spy = vi.spyOn(store, 'dispatch');
    (cmp as any).upsert({ extraccionDisplayEnabled: true });
    expect(spy).toHaveBeenCalledWith(upsertTotemConfig({
      branchId: 7, enabled: false, atencionDisplayEnabled: false, extraccionDisplayEnabled: true,
    }));
  });
});
