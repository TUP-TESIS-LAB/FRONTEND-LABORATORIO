import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError, firstValueFrom } from 'rxjs';
import { BranchBootstrapService } from './branch-bootstrap.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { SucursalesService } from '@features/sucursales/services/sucursales.service';

describe('BranchBootstrapService', () => {
  let ctx: {
    branchId: ReturnType<typeof signal<number | null>>;
    branchName: ReturnType<typeof signal<string | null>>;
    setBranch: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  let user: { currentUser: ReturnType<typeof signal<any>> };
  let sucursales: { listBranchesForSelector: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ctx = {
      branchId: signal<number | null>(null),
      branchName: signal<string | null>(null),
      setBranch: vi.fn(),
      clear: vi.fn(),
    };
    user = { currentUser: signal<any>(null) };
    sucursales = { listBranchesForSelector: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        BranchBootstrapService,
        { provide: OperatorBranchContextService, useValue: ctx },
        { provide: UserSessionService, useValue: user },
        { provide: SucursalesService, useValue: sucursales },
      ],
    });
  });

  it('si el id persistido pertenece al tenant y el name coincide, no re-setea', async () => {
    // Antes cortábamos sin pegarle a la API; ahora SIEMPRE validamos el id
    // persistido contra las sucursales del tenant actual (evita arrastrar la
    // sucursal de otro tenant). Si el id existe y el name coincide, no toca nada.
    ctx.branchId.set(5);
    ctx.branchName.set('Central');
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 5, name: 'Central' },
      { id: 3, name: 'Norte' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
    expect(ctx.clear).not.toHaveBeenCalled();
  });

  it('si hay id pero no name, resuelve el name desde la lista de branches', async () => {
    ctx.branchId.set(5);
    ctx.branchName.set(null);
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 3, name: 'Norte' },
      { id: 5, name: 'Central' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(5, 'Central');
  });

  it('si el id persistido NO existe en el tenant (stale), cae al fallback (auto-cura)', async () => {
    ctx.branchId.set(1); // id viejo/stale que ya no existe (ej. localStorage previo)
    ctx.branchName.set(null);
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 1001, name: 'Central' },
      { id: 1002, name: 'Norte' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(1001, 'Central');
  });

  it('si no hay id en context pero el user tiene branch, usa ese id y resuelve name', async () => {
    user.currentUser.set({ id: 1, branch: 7 } as any);
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 7, name: 'Sur' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(7, 'Sur');
  });

  it('si no hay nada, usa la primera sucursal de la lista (fallback)', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(of([
      { id: 9, name: 'Default' },
      { id: 10, name: 'Otra' },
    ]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).toHaveBeenCalledWith(9, 'Default');
  });

  it('si la API falla, no rompe el bootstrap (resuelve igual sin setear)', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(throwError(() => new Error('500')));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
  });

  it('si la API devuelve lista vacia, no setea nada', async () => {
    sucursales.listBranchesForSelector.mockReturnValue(of([]));
    const svc = TestBed.inject(BranchBootstrapService);
    await firstValueFrom(svc.init());
    expect(ctx.setBranch).not.toHaveBeenCalled();
  });
});
