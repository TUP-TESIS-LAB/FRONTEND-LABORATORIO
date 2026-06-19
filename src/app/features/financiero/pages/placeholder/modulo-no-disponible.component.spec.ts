import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ModuloNoDisponibleComponent } from './modulo-no-disponible.component';

/**
 * Smoke test: ModuloNoDisponibleComponent con kind='coberturas'.
 * Verifica que se muestra "Coberturas" y "Módulo no disponible".
 *
 * Usa overrideTemplate para evitar NG0950 de input.required() en vitest.
 */
describe('ModuloNoDisponibleComponent — smoke (coberturas)', () => {
  const minimalTemplate = `
    <div class="fin-placeholder">
      <h1 data-testid="placeholder-title">{{ title() }}</h1>
      <h3 data-testid="placeholder-heading">{{ heading }}</h3>
    </div>
  `;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuloNoDisponibleComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ kind: 'coberturas' }),
            snapshot: { data: { kind: 'coberturas' } },
          },
        },
      ],
    })
      .overrideTemplate(ModuloNoDisponibleComponent, minimalTemplate)
      .compileComponents();
  });

  it('muestra "Coberturas" en el título', () => {
    const fixture = TestBed.createComponent(ModuloNoDisponibleComponent);
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('[data-testid="placeholder-title"]'));
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent).toContain('Coberturas');
  });

  it('muestra "Módulo no disponible" en el heading', () => {
    const fixture = TestBed.createComponent(ModuloNoDisponibleComponent);
    fixture.detectChanges();

    const heading = fixture.debugElement.query(By.css('[data-testid="placeholder-heading"]'));
    expect(heading).toBeTruthy();
    expect(heading.nativeElement.textContent).toContain('Módulo no disponible');
  });
});
