import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

/**
 * Asegura que el operador tenga una sucursal activa antes de entrar a las
 * pantallas de turnos. Estrategia:
 *
 *   1. Si OperatorBranchContextService ya tiene id Y name -> nada que hacer.
 *   2. Si tiene id pero falta name -> bajar la lista de sucursales y matchear.
 *   3. Si no tiene id pero el user (UserSessionService) tiene un branch
 *      asignado -> usar ese id y resolver name vía la lista.
 *   4. Fallback: usar la primera sucursal del tenant. Documentado como
 *      temporal en el spec — se elimina cuando el backend asigne sucursal
 *      por usuario en el login response.
 *
 * Errores son no-fatal: si la API falla, el badge muestra "Sin sucursal"
 * y las pantallas dependientes muestran fallback. No bloqueamos el boot.
 */
@Injectable({ providedIn: 'root' })
export class BranchBootstrapService {
  private readonly ctx = inject(OperatorBranchContextService);
  private readonly user = inject(UserSessionService);
  private readonly sucursales = inject(SucursalesService);

  init(): Observable<void> {
    const currentId = this.ctx.branchId();

    // SIEMPRE validamos el id persistido contra las sucursales del tenant ACTUAL.
    // Antes cortábamos si había id+name, pero eso arrastraba la sucursal del tenant
    // anterior (localStorage no scopeado por tenant) y rompía el alta de atención.
    return this.sucursales.listBranchesForSelector().pipe(
      tap(branches => {
        if (branches.length === 0) return;

        // Caso 1/2: el id persistido pertenece al tenant -> mantener (refrescar name).
        if (currentId != null) {
          const match = branches.find(b => b.id === currentId);
          if (match) {
            if (this.ctx.branchName() !== match.name) this.ctx.setBranch(match.id, match.name);
            return;
          }
          // El id persistido NO pertenece a este tenant (stale: otro tenant /
          // sucursal eliminada). Lo limpiamos y re-resolvemos abajo (auto-cura).
          this.ctx.clear();
        }

        // Caso 3: hay branch en user -> usar y resolver name
        const userBranchId = this.user.currentUser()?.branch ?? null;
        if (userBranchId != null) {
          const match = branches.find(b => b.id === userBranchId);
          if (match) {
            this.ctx.setBranch(match.id, match.name);
            return;
          }
        }

        // Caso 4: fallback a la primera del tenant
        const first = branches[0];
        this.ctx.setBranch(first.id, first.name);
      }),
      map(() => void 0),
      catchError(err => {
        console.warn('[BranchBootstrap] no se pudo resolver la sucursal activa', err);
        return of(void 0);
      }),
    );
  }
}
