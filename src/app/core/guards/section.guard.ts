import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs/operators';
import { AccessSection } from '@core/access/access.model';
import { selectAccessState } from '@core/access/store/access.selectors';

export const sectionGuard = (section: AccessSection): CanMatchFn =>
  () => {
    const store = inject(Store);
    const router = inject(Router);

    return store.select(selectAccessState).pipe(
      filter((s) => s.loaded),
      take(1),
      map((s) => (s.sections.includes(section) ? true : router.createUrlTree(['/home']))),
    );
  };
