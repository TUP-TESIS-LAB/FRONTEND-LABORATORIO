import {
  selectObraSocialItems, selectObraSocialPending, selectObraSocialPageRequest,
  selectSelectedObraSocial, selectObraSocialInsurerTypes, selectNbuOptions,
} from './obra-social.selectors';
import { OBRA_SOCIAL_FEATURE_KEY, initialObraSocialState } from './obra-social.state';

describe('obra-social selectors', () => {
  const state = {
    [OBRA_SOCIAL_FEATURE_KEY]: {
      ...initialObraSocialState,
      items: [{ id: 1 } as never],
      pending: true,
      insurerTypes: [{ name: 'SOCIAL', description: 'Obra Social' }],
      nbuVersions: [
        { id: 1, versionCode: '2017_2020', publicationYear: 2017, effectivityDate: '2017-01-01' },
        { id: 2, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' },
      ],
    },
  } as never;

  it('selectObraSocialItems devuelve items', () => {
    expect(selectObraSocialItems(state)).toEqual([{ id: 1 }]);
  });

  it('selectObraSocialPending devuelve el flag', () => {
    expect(selectObraSocialPending(state)).toBe(true);
  });

  it('selectObraSocialPageRequest devuelve el page request', () => {
    expect(selectObraSocialPageRequest(state)).toEqual(initialObraSocialState.pageRequest);
  });

  it('selectSelectedObraSocial devuelve null cuando no hay selección', () => {
    expect(selectSelectedObraSocial(state)).toBeNull();
  });

  it('selectObraSocialInsurerTypes devuelve el catálogo', () => {
    expect(selectObraSocialInsurerTypes(state).length).toBe(1);
  });

  it('selectNbuOptions deriva {label,value} ordenado por año desc', () => {
    const opts = selectNbuOptions(state);
    expect(opts[0]).toEqual({ label: '2021_2024', value: 2 });
    expect(opts[1]).toEqual({ label: '2017_2020', value: 1 });
  });
});
