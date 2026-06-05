import { ActionReducer, MetaReducer } from '@ngrx/store';
import { isDevMode } from '@angular/core';

// Logueo opt-in. Por default la consola queda LIMPIA: el polling de las colas
// despacha ~8 actions cada 5s y sin filtro inunda la consola. Para prenderlo en
// una sesión de debug, desde la consola del browser:
//   localStorage.setItem('ngrxLog', '1')   // toma efecto en la próxima action
// Para apagarlo:
//   localStorage.removeItem('ngrxLog')
function ngrxLogEnabled(): boolean {
  try {
    return localStorage.getItem('ngrxLog') === '1';
  } catch {
    return false; // SSR / storage bloqueado → sin logging
  }
}

// Envuelve cualquier reducer y, SOLO si el flag está activo, loguea por cada
// action despachada el estado previo, la action y el estado siguiente. Como
// envuelve TODOS los reducers (root + features + router-store), también
// cubriría las actions del routing (@ngrx/router-store).
function loggerMetaReducer<S, A extends { type: string }>(
  reducer: ActionReducer<S, A>,
): ActionReducer<S, A> {
  return (state, action) => {
    const prevState = state;
    const nextState = reducer(state, action);

    if (ngrxLogEnabled()) {
      const time = new Date().toLocaleTimeString();
      console.groupCollapsed(`action ${action.type} @ ${time}`);
      console.log('prev state', prevState);
      console.log('action   ', action);
      console.log('next state', nextState);
      console.groupEnd();
    }

    return nextState;
  };
}

// Solo en desarrollo. En un build de producción (ng build), isDevMode()
// devuelve false y el array queda vacío: cero logging, sin necesidad de
// archivos de environment (el proyecto no usa environments/).
export const metaReducers: MetaReducer[] = isDevMode() ? [loggerMetaReducer] : [];
