import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TransitoPage } from './transito.page';

function installLocalStorageMock() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
  return store;
}

describe('TransitoPage smoke', () => {
  let fixture: ComponentFixture<TransitoPage>;

  beforeEach(async () => {
    installLocalStorageMock();
    await TestBed.configureTestingModule({
      imports: [TransitoPage],
      providers: [
        provideNoopAnimations(),
        MessageService,
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TransitoPage);
  });

  it('renderiza el header con stats', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Muestras en tránsito');
    expect(text).toMatch(/\d+ en tránsito/);
  });

  it('renderiza al menos un group con seed por defecto', () => {
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('app-recommended-group-card');
    expect(groups.length).toBeGreaterThan(0);
  });
});
