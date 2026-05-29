import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AgendaConfigService } from '../services/agenda-config.service';
import { AgendaConfig } from '../models/agenda-config.model';

export const agendaConfigResolver: ResolveFn<AgendaConfig | null> = (route) => {
  const service = inject(AgendaConfigService);
  const router = inject(Router);
  const idParam = route.paramMap.get('id');
  const id = idParam ? Number(idParam) : NaN;

  if (!idParam || Number.isNaN(id)) {
    router.navigate(['/turnos/configuracion']);
    return of(null);
  }

  return service.getById(id).pipe(
    catchError(() => {
      router.navigate(['/turnos/configuracion']);
      return of(null);
    })
  );
};
