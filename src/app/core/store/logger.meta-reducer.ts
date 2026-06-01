import { ActionReducer, MetaReducer } from '@ngrx/store';
import { isDevMode } from '@angular/core';

// Envuelve cualquier reducer y loguea, por cada action despachada,
// el estado previo, la action y el estado siguiente. Como envuelve TODOS
// los reducers (root + features + router-store), también loguea las actions
// del routing (@ngrx/router-store).
function loggerMetaReducer<S, A extends { type: string }>(
  reducer: ActionReducer<S, A>,
): ActionReducer<S, A> {
  return (state, action) => {
    const prevState = state;
    const nextState = reducer(state, action);
    const time = new Date().toLocaleTimeString();

    console.groupCollapsed(`action ${action.type} @ ${time}`);
    console.log('prev state', prevState);
    console.log('action   ', action);
    console.log('next state', nextState);
    console.groupEnd();

    return nextState;
  };
}

// Solo en desarrollo. En un build de producción (ng build), isDevMode()
// devuelve false y el array queda vacío: cero logging, sin necesidad de
// archivos de environment (el proyecto no usa environments/).
export const metaReducers: MetaReducer[] = isDevMode() ? [loggerMetaReducer] : [];
