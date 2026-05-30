import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { AccessRegistry } from './access-registry';
import { ACCESS_FEATURE_KEY, initialAccessState } from './store/access.state';

describe('AccessRegistry', () => {
  function setup(sections: string[]) {
    TestBed.configureTestingModule({
      providers: [
        AccessRegistry,
        provideMockStore({ initialState: { [ACCESS_FEATURE_KEY]: { ...initialAccessState, sections } } }),
      ],
    });
    return TestBed.inject(AccessRegistry);
  }

  it('has() true si la seccion esta concedida', () => {
    const reg = setup(['ATENCION', 'TURNOS']);
    expect(reg.has('ATENCION')).toBe(true);
    expect(reg.has('FINANCIERO')).toBe(false);
  });
});
