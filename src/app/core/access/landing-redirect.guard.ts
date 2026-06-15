import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs/operators';
import { AccessSection } from '@core/access/access.model';
import { selectAccessState } from '@core/access/store/access.selectors';

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
    map((s) => {
      const target = LANDING_ORDER.find((o) => s.sections.includes(o.section));
      // Con sección accesible → redirige a la primera. Sin ninguna → deja el fallback.
      return target ? router.createUrlTree([target.path]) : true;
    }),
  );
};
