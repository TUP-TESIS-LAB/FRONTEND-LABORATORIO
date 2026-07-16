import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Bus mínimo para que el header de la pantalla Empresa (componente padre) dispare
 * el alta de usuario, cuyo drawer vive en `UsuariosPage` (componente hijo del
 * router-outlet). El botón "Nuevo usuario" del header llama `requestCreate()` y
 * la page lo escucha por `create$` para abrir el drawer in-place.
 */
@Injectable({ providedIn: 'root' })
export class UsuariosCreateBus {
  private readonly _create$ = new Subject<void>();
  readonly create$: Observable<void> = this._create$.asObservable();

  requestCreate(): void {
    this._create$.next();
  }
}
