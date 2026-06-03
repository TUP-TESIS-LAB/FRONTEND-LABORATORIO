import { TestBed } from '@angular/core/testing';
import { NotificationHostComponent } from './notification-host.component';
import { NotificationService } from '@core/services/notification.service';

describe('NotificationHostComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [NotificationHostComponent] });
    const fixture = TestBed.createComponent(NotificationHostComponent);
    const svc = TestBed.inject(NotificationService);
    fixture.detectChanges();
    return { fixture, svc };
  }

  it('renderiza una notificación del servicio', () => {
    const { fixture, svc } = setup();
    svc.success('Accesos actualizados');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accesos actualizados');
  });

  it('al cerrar, la quita del servicio', () => {
    const { fixture, svc } = setup();
    svc.success('Hola');
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('.notif__close') as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    expect(svc.notifications().length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Hola');
  });
});
