import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AtencionDashboardComponent } from './atencion-dashboard.component';
import { ATENCION_FEATURE_KEY, initialAtencionState } from '../../../store/atencion/atencion.state';
import { downloadProtocolLabels } from '../../../store/atencion/atencion.actions';
import { AttentionState, isSecretaryResumable } from '../../../models/atencion.model';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { ConfirmationService } from 'primeng/api';

/** Stub de ModuleRegistry para no depender del feature `tenant` en el MockStore. */
function moduleRegistryStub(financieroActive: boolean) {
  return { isActive: (key: ModuleKey) => key === ModuleKey.Financiero ? financieroActive : true };
}

function setup(financieroActive = true) {
  TestBed.configureTestingModule({
    imports: [AtencionDashboardComponent],
    providers: [
      provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } }),
      provideRouter([]),
      provideNoopAnimations(),
      { provide: ModuleRegistry, useValue: moduleRegistryStub(financieroActive) },
    ],
  });
  return TestBed.createComponent(AtencionDashboardComponent);
}

describe('AtencionDashboardComponent', () => {
  it('downloadLabels pide confirmación de reimpresión y NO despacha hasta aceptar', () => {
    const fixture = setup();
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    // ConfirmationService está provisto a nivel componente, así que lo resolvemos
    // desde el injector del componente (no el root del TestBed).
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    // Capturamos el confirm sin auto-aceptar.
    let accept: (() => void) | undefined;
    vi.spyOn(confirm, 'confirm').mockImplementation((opts: any) => {
      accept = opts.accept;
      return confirm;
    });

    fixture.componentInstance.downloadLabels({ id: 1, protocolId: 9 } as any);
    // Antes de confirmar no se descarga nada.
    expect(spy).not.toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));

    // Al aceptar, recién ahí despacha la descarga.
    accept!();
    expect(spy).toHaveBeenCalledWith(downloadProtocolLabels({ protocolId: 9, protocolNumber: 'P-9' }));
  });

  it('downloadLabels sin protocolId no abre el diálogo', () => {
    const fixture = setup();
    const confirm = fixture.debugElement.injector.get(ConfirmationService);
    const confirmSpy = vi.spyOn(confirm, 'confirm');
    fixture.componentInstance.downloadLabels({ id: 1, protocolId: null } as any);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('embedded=true oculta el header (Nueva atención) y el bloque de KPIs', () => {
    const fixture = setup();
    fixture.componentRef.setInput('embedded', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Nueva atención');
    expect(fixture.nativeElement.textContent).not.toContain('Resumen del día');
    expect(fixture.nativeElement.querySelector('ui-stat-card')).toBeNull();
  });

  it('embedded=false (default) muestra header y el bloque colapsable de KPIs', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nueva atención');
    expect(fixture.nativeElement.textContent).toContain('Resumen del día');
    // 010: los KPIs arrancan colapsados (las cards no se renderizan hasta expandir).
    expect(fixture.nativeElement.querySelector('ui-stat-card')).toBeNull();
  });

  it('010: toggleKpis expande y renderiza las stat-cards (Canceladas hoy + Finalizadas)', () => {
    const fixture = setup();
    fixture.detectChanges();
    fixture.componentInstance.toggleKpis();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('ui-stat-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Canceladas hoy');
    expect(fixture.nativeElement.textContent).toContain('Finalizadas');
  });

  it('009: con FINANCIERO activo el filtro ofrece Cobro y Facturación', () => {
    const fixture = setup(true);
    const values = fixture.componentInstance['stateOptions']().map((o: any) => o.value);
    expect(values).toContain(AttentionState.ON_COLLECTION_PROCESS);
    expect(values).toContain(AttentionState.ON_BILLING_PROCESS);
  });

  it('009: con FINANCIERO inactivo el filtro NO ofrece Cobro ni Facturación', () => {
    const fixture = setup(false);
    const values = fixture.componentInstance['stateOptions']().map((o: any) => o.value);
    expect(values).not.toContain(AttentionState.ON_COLLECTION_PROCESS);
    expect(values).not.toContain(AttentionState.ON_BILLING_PROCESS);
    // Estados no financieros siguen presentes.
    expect(values).toContain(AttentionState.AWAITING_EXTRACTION);
  });

  it('011: isSecretaryResumable es false desde AWAITING_EXTRACTION (botón "Ver"), true en fases de secretaría', () => {
    expect(isSecretaryResumable(AttentionState.REGISTERING_GENERAL_DATA)).toBe(true);
    expect(isSecretaryResumable(AttentionState.AWAITING_CONFIRMATION)).toBe(true);
    expect(isSecretaryResumable(AttentionState.AWAITING_EXTRACTION)).toBe(false);
    expect(isSecretaryResumable(AttentionState.IN_EXTRACTION)).toBe(false);
    expect(isSecretaryResumable(AttentionState.FINISHED)).toBe(false);
  });

  it('013: cancellationTooltip devuelve el motivo en estados terminales y null en el resto', () => {
    const c = setup().componentInstance;
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.CANCELED, cancellationReason: 'Paciente desistió', extractionCancellationReason: null } as any,
    )).toBe('Paciente desistió');
    // Cae al motivo de "no se presentó" cuando no hay cancelación terminal.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.FAILED, cancellationReason: null, extractionCancellationReason: 'No se presentó' } as any,
    )).toBe('No se presentó');
    // Estado no terminal → sin tooltip.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.AWAITING_EXTRACTION, cancellationReason: 'x', extractionCancellationReason: null } as any,
    )).toBeNull();
    // Terminal pero sin motivo → null.
    expect(c.cancellationTooltip(
      { attentionState: AttentionState.CANCELED, cancellationReason: null, extractionCancellationReason: null } as any,
    )).toBeNull();
  });
});
