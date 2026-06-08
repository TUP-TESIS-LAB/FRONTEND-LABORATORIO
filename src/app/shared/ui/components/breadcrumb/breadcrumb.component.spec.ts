import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BreadcrumbComponent } from './breadcrumb.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('BreadcrumbComponent', () => {
  async function setup(url: string) {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [
        provideRouter([
          {
            path: 'recepcion',
            data: { breadcrumb: 'Recepción' },
            component: DummyComponent,
            children: [
              { path: 'detalle', data: { breadcrumb: 'Detalle' }, component: DummyComponent },
            ],
          },
          { path: 'sin-miga', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);

    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('arma las migas desde data.breadcrumb de las rutas activas, en orden', async () => {
    const fixture = await setup('/recepcion/detalle');
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Recepción');
    expect(text).toContain('Detalle');
    expect(text.indexOf('Recepción')).toBeLessThan(text.indexOf('Detalle'));
  });

  it('renderiza una sola miga cuando solo el padre tiene breadcrumb', async () => {
    const fixture = await setup('/recepcion');
    const items = fixture.nativeElement.querySelectorAll('.ui-breadcrumb__item');

    expect(items.length).toBe(1);
    expect(items[0].textContent.trim()).toBe('Recepción');
    // Sin separador cuando hay una sola miga.
    expect(fixture.nativeElement.querySelectorAll('.ui-breadcrumb__sep').length).toBe(0);
  });

  it('marca la última miga como current y dibuja un separador entre migas', async () => {
    const fixture = await setup('/recepcion/detalle');
    const items = fixture.nativeElement.querySelectorAll('.ui-breadcrumb__item');
    const seps = fixture.nativeElement.querySelectorAll('.ui-breadcrumb__sep');

    expect(items.length).toBe(2);
    expect(seps.length).toBe(1);
    expect(items[1].classList).toContain('ui-breadcrumb__item--current');
    expect(items[0].classList).not.toContain('ui-breadcrumb__item--current');
  });

  it('no renderiza migas cuando la ruta activa no define breadcrumb', async () => {
    const fixture = await setup('/sin-miga');
    const items = fixture.nativeElement.querySelectorAll('.ui-breadcrumb__item');

    expect(items.length).toBe(0);
  });
});
