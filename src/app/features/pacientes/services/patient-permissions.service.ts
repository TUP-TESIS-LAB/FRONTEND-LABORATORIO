import { Injectable, computed, inject } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

// Backend authorises mutations for ADMINISTRADOR / SECRETARIA.
// Frontend Role enum uses lowercase ids: 'admin', 'administrativo', 'recepcionista'.
const MUTATING_ROLES = new Set([
  'admin', 'administrativo', 'recepcionista',
  'ADMINISTRADOR', 'SECRETARIA',
]);

@Injectable({ providedIn: 'root' })
export class PatientPermissionsService {
  private readonly tokens = inject(TokenService);
  readonly canMutate = computed(() =>
    this.tokens.getRoles().some((r) => MUTATING_ROLES.has(r)),
  );
}
