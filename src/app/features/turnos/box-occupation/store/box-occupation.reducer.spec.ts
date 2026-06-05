import { boxOccupationReducer } from './box-occupation.reducer';
import { initialBoxOccupationState } from './box-occupation.state';
import * as A from './box-occupation.actions';

describe('boxOccupationReducer', () => {
  it('loadBoxOccupationsSuccess populates occupations', () => {
    const result = boxOccupationReducer(
      initialBoxOccupationState,
      A.loadBoxOccupationsSuccess({
        occupations: [
          { id: 1, branchId: 1001, userId: 10002, userName: 'Ana R.', boxType: 'ATENCION', boxNumber: 2, occupiedAt: '2026-06-05T09:00:00Z' },
        ],
      }),
    );
    expect(result.occupations.length).toBe(1);
    expect(result.loading).toBe(false);
  });

  it('clearBoxOccupations resets state', () => {
    const populated = boxOccupationReducer(
      initialBoxOccupationState,
      A.loadBoxOccupationsSuccess({
        occupations: [{ id: 1, branchId: 1001, userId: 10002, userName: 'A', boxType: 'ATENCION', boxNumber: 1, occupiedAt: '' }],
      }),
    );
    const cleared = boxOccupationReducer(populated, A.clearBoxOccupations());
    expect(cleared.occupations.length).toBe(0);
  });
});
