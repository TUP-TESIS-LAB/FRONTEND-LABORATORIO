import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, filter, map, take, timeout } from 'rxjs/operators';
import { AccessSection } from '@core/access/access.model';
import { selectAccessState } from '@core/access/store/access.selectors';

/**
 * Tope de espera de las secciones antes de caer al home. En condiciones normales
 * `loaded` se prende en <200ms; el timeout solo actúa si la request quedó colgada
 * (BE caído / proxy sin responder) para no congelar el login para siempre.
 */
const SECTIONS_LOAD_TIMEOUT_MS = 10_000;

/**
 * Landing tras el login: ya no hay pantalla "Inicio" fija. Redirige a la primera
 * sección accesible del usuario (en orden de prioridad). Si el usuario no tiene
 * ninguna sección, deja renderizar la ruta destino (fallback) en vez de redirigir,
 * para no entrar en un loop de redirecciones.
 */
const LANDING_ORDER: { section: AccessSection; path: string }[] = [
  { section: 'RECEPCION', path: '/turnos/recepcion' },
  { section: 'EXTRACCIONES', path: '/analitica/extraccion' },
  { section: 'PACIENTES', path: '/pacientes' },
  { section: 'PREANALITICA', path: '/analitica/recoleccion' },
  { section: 'ANALITICA', path: '/analitica/procesamiento' },
  { section: 'POSTANALITICA', path: '/analitica/descarte' },
  { section: 'OBRAS_SOCIALES', path: '/obras-sociales' },
  { section: 'FINANCIERO', path: '/financiero' },
  { section: 'SUCURSALES', path: '/sucursales' },
  { section: 'EMPRESA', path: '/empresa' },
  { section: 'STOCK', path: '/stock' },
];

export const landingRedirectGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectAccessState).pipe(
    filter((s) => s.loaded),
    take(1),
    map((s): boolean | UrlTree => {
      const target = LANDING_ORDER.find((o) => s.sections.includes(o.section));
      // Con sección accesible → redirige a la primera. Sin ninguna → deja el fallback.
      return target ? router.createUrlTree([target.path]) : true;
    }),
    // Si las secciones nunca cargan (request colgada), no congelar la navegación:
    // caer al home como fallback. Mismo criterio que "sin secciones".
    timeout({ first: SECTIONS_LOAD_TIMEOUT_MS }),
    catchError(() => of(true as boolean | UrlTree)),
  );
};
