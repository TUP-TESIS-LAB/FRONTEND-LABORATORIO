import { TestBed } from '@angular/core/testing';
import { OperatorBranchContextService } from './operator-branch.context';

describe('OperatorBranchContextService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('arranca con branchId y branchName null si no hay nada en storage', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
  });

  it('setBranch persiste {id, name} en localStorage y actualiza signals', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranch(5, 'Sucursal Central');
    expect(svc.branchId()).toBe(5);
    expect(svc.branchName()).toBe('Sucursal Central');
    expect(JSON.parse(localStorage.getItem('turnos.operatorBranch')!)).toEqual({ id: 5, name: 'Sucursal Central' });
  });

  it('migra el storage key viejo (turnos.operatorBranchId) cuando no hay nuevo', () => {
    localStorage.setItem('turnos.operatorBranchId', '7');
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBe(7);
    expect(svc.branchName()).toBeNull();
  });

  it('si coexisten ambos keys, el nuevo gana sobre el legacy', () => {
    localStorage.setItem('turnos.operatorBranch', JSON.stringify({ id: 11, name: 'Sucursal Nueva' }));
    localStorage.setItem('turnos.operatorBranchId', '99');
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBe(11);
    expect(svc.branchName()).toBe('Sucursal Nueva');
  });

  it('clear elimina ambos keys del storage', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranch(3, 'X');
    localStorage.setItem('turnos.operatorBranchId', '99');
    svc.clear();
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
    expect(localStorage.getItem('turnos.operatorBranch')).toBeNull();
    expect(localStorage.getItem('turnos.operatorBranchId')).toBeNull();
  });

  it('ignora JSON corrupto en el storage nuevo', () => {
    localStorage.setItem('turnos.operatorBranch', 'not-json');
    const svc = TestBed.inject(OperatorBranchContextService);
    expect(svc.branchId()).toBeNull();
    expect(svc.branchName()).toBeNull();
  });

  it('setBranchId (compat) persiste solo el id, name queda null', () => {
    const svc = TestBed.inject(OperatorBranchContextService);
    svc.setBranchId(9);
    expect(svc.branchId()).toBe(9);
    expect(svc.branchName()).toBeNull();
  });
});
