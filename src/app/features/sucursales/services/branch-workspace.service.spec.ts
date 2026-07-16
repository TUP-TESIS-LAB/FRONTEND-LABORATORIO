import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BranchWorkspaceService } from './branch-workspace.service';

describe('BranchWorkspaceService', () => {
  let service: BranchWorkspaceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchWorkspaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET on branches/{branchId}/workspaces', () => {
    service.list(3).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/3/workspaces');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('sync sends PUT with workspaces array in body', () => {
    const entries = [{ areaId: 1, sectionId: 2 }, { areaId: 1, sectionId: 3 }];
    service.sync(3, entries).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/3/workspaces');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ workspaces: entries });
    req.flush([
      { id: 10, branchId: 3, areaId: 1, sectionId: 2 },
      { id: 11, branchId: 3, areaId: 1, sectionId: 3 },
    ]);
  });

  it('sync with empty array clears all workspaces', () => {
    service.sync(3, []).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/3/workspaces');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ workspaces: [] });
    req.flush([]);
  });
});
