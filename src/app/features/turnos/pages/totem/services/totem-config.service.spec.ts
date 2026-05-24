import { TestBed } from '@angular/core/testing';
import { TotemConfigService } from './totem-config.service';

describe('TotemConfigService', () => {
  let service: TotemConfigService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TotemConfigService);
  });

  it('starts with null branchId when localStorage is empty', () => {
    expect(service.branchId()).toBeNull();
  });

  it('returns stored branchId when localStorage has value', () => {
    localStorage.setItem('totem.branchId', '7');
    TestBed.resetTestingModule();
    service = TestBed.inject(TotemConfigService);
    expect(service.branchId()).toBe(7);
  });

  it('setBranchId persists to localStorage and emits via signal', () => {
    service.setBranchId(42);
    expect(localStorage.getItem('totem.branchId')).toBe('42');
    expect(service.branchId()).toBe(42);
  });

  it('clearBranchId removes from localStorage and emits null', () => {
    service.setBranchId(42);
    service.clearBranchId();
    expect(localStorage.getItem('totem.branchId')).toBeNull();
    expect(service.branchId()).toBeNull();
  });
});
