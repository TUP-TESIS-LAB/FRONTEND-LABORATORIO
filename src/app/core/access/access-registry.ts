import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccessSection } from './access.model';
import { selectMySections } from './store/access.selectors';

@Injectable({ providedIn: 'root' })
export class AccessRegistry {
  private readonly sections = inject(Store).selectSignal(selectMySections);

  has(section: AccessSection): boolean {
    return this.sections().includes(section);
  }
}
