import { describe, it, expect } from 'vitest';
import { branchTotemConfigReducer } from './branch-totem-config.reducer';
import { initialBranchTotemConfigState } from './branch-totem-config.state';
import * as A from './branch-totem-config.actions';
import {
  selectAtencionDisplayEnabled,
  selectExtraccionDisplayEnabled,
  selectBranchTotemEnabled,
} from './branch-totem-config.selectors';

describe('branchTotemConfigReducer', () => {
  it('loadSuccess setea los tres flags', () => {
    const state = branchTotemConfigReducer(
      initialBranchTotemConfigState,
      A.loadBranchTotemConfigSuccess({
        branchId: 5, enabled: true, atencionDisplayEnabled: false, extraccionDisplayEnabled: true,
      }),
    );
    expect(state.branchId).toBe(5);
    expect(state.enabled).toBe(true);
    expect(state.atencionDisplayEnabled).toBe(false);
    expect(state.extraccionDisplayEnabled).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('loadFailure cae a false en todos los flags', () => {
    const state = branchTotemConfigReducer(
      { ...initialBranchTotemConfigState, enabled: true, atencionDisplayEnabled: true, extraccionDisplayEnabled: true },
      A.loadBranchTotemConfigFailure({ error: 'boom' }),
    );
    expect(state.enabled).toBe(false);
    expect(state.atencionDisplayEnabled).toBe(false);
    expect(state.extraccionDisplayEnabled).toBe(false);
    expect(state.error).toBe('boom');
  });
});

describe('branch-totem-config selectors', () => {
  it('proyectan los flags (false cuando la slice no existe)', () => {
    expect(selectAtencionDisplayEnabled.projector(undefined)).toBe(false);
    expect(selectExtraccionDisplayEnabled.projector(undefined)).toBe(false);
    expect(selectBranchTotemEnabled.projector(undefined)).toBeNull();

    const s = {
      branchId: 1, enabled: true, atencionDisplayEnabled: true, extraccionDisplayEnabled: false,
      loading: false, error: null,
    };
    expect(selectAtencionDisplayEnabled.projector(s)).toBe(true);
    expect(selectExtraccionDisplayEnabled.projector(s)).toBe(false);
  });
});
