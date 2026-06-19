import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Button } from 'primeng/button';
import { SelectModule } from 'primeng/select';

import { TokenService } from '@core/auth/token.service';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

import { FiscalProvider, PROVIDER_META } from '../../models/financiero.model';
import {
  loadFiscalConfig,
  saveFiscalConfig,
} from '../../store/financiero.actions';
import {
  selectFiscalConfig,
  selectFiscalSaving,
} from '../../store/financiero.selectors';

// ──────────────────────────────────────────────────────────────────────────────
// Per-provider credential shapes (stored in configJson)
// ──────────────────────────────────────────────────────────────────────────────
interface ArcaCredentials {
  cuit: string;
  cert: string;
  ambiente: 'Producción' | 'Homologación';
}

interface ColppyCredentials {
  apiKey: string;
  usuario: string;
}

const PROVIDERS_LIST: FiscalProvider[] = ['ARCA', 'COLPPY', 'NONE'];

@Component({
  selector: 'fin-config-fiscal-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Button,
    SelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="fin-config">
      <ui-page-header
        heading="Configuración fiscal"
        subtitle="Proveedor de facturación del laboratorio. Pantalla administrativa — separada de la operación de mostrador."
      />

      <!-- Acceso restringido (fallback defensivo) -->
      @if (!isSaasAdmin()) {
        <div class="fin-card fin-card--pad">
          <ui-empty-state
            icon="pi-lock"
            heading="Acceso restringido"
            description="La configuración fiscal del laboratorio solo puede gestionarla un administrador del SaaS."
          />
        </div>
      } @else {

        <!-- Tenant selector + provider picker -->
        <div class="fin-card fin-card--pad" style="margin-bottom:18px">

          <!-- Tenant selector (single option: este tenant) -->
          <div class="fin-field" style="margin-bottom:14px">
            <label class="fin-label">Laboratorio (tenant)</label>
            <div class="fin-selbox">
              <select class="fin-select" disabled>
                <option>Laboratorio — este tenant (ID {{ tenantId() }})</option>
              </select>
              <span class="fin-select-icon"><i class="pi pi-angle-down"></i></span>
            </div>
            <!-- NOTE: tenantId comes from TokenService.getTenantId() (JWT payload.tenantId).
                 A real multi-tenant admin selector would require a separate API call
                 to list all tenants; deferred to a future ticket. -->
          </div>

          <!-- Provider picker (radio cards) -->
          <div class="fin-section-cap">Proveedor fiscal</div>
          <div class="fin-provider-pick">
            @for (key of providerKeys; track key) {
              <div
                class="fin-prov-card"
                [class.fin-prov-card--selected]="selectedProvider() === key"
                (click)="selectProvider(key)"
                role="radio"
                [attr.aria-checked]="selectedProvider() === key"
                tabindex="0"
                (keydown.enter)="selectProvider(key)"
                (keydown.space)="selectProvider(key)">
                <div class="fin-prov-card__top">
                  <div class="fin-prov-card__ico">
                    <i [class]="'pi ' + providerMeta[key].icon"></i>
                  </div>
                  <div class="fin-prov-card__name">{{ providerMeta[key].label }}</div>
                  <div class="fin-prov-radio"
                    [class.fin-prov-radio--checked]="selectedProvider() === key"></div>
                </div>
                <div class="fin-prov-card__desc">{{ providerMeta[key].sub }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Credentials section (dynamic by provider) -->
        @if (selectedProvider() !== 'NONE') {
          <div class="fin-card fin-card--pad" style="margin-bottom:18px">
            <div class="fin-section-cap">
              Credenciales · {{ providerMeta[selectedProvider()].label }}
            </div>
            <div class="fin-form-grid">

              <!-- Punto de venta (shared between ARCA and COLPPY) -->
              <div class="fin-field">
                <label class="fin-label">
                  Punto de venta <span class="fin-req">obligatorio</span>
                </label>
                <input
                  class="fin-input fin-input--mono"
                  type="text"
                  [(ngModel)]="invoicePointOfSale"
                  placeholder="0003"
                />
                <div class="fin-hint">
                  Número de punto de venta habilitado para emitir comprobantes.
                </div>
              </div>

              @if (selectedProvider() === 'ARCA') {
                <!-- ARCA: CUIT -->
                <div class="fin-field">
                  <label class="fin-label">
                    CUIT del laboratorio <span class="fin-req">obligatorio</span>
                  </label>
                  <input
                    class="fin-input fin-input--mono"
                    type="text"
                    [(ngModel)]="arcaCreds.cuit"
                    placeholder="30-XXXXXXXX-X"
                  />
                </div>

                <!-- ARCA: Certificado -->
                <div class="fin-field">
                  <label class="fin-label">
                    Certificado (.crt / .pem) <span class="fin-req">obligatorio</span>
                  </label>
                  <div class="fin-cert-row">
                    <input
                      class="fin-input"
                      type="text"
                      [value]="arcaCreds.cert || ''"
                      placeholder="Ningún archivo cargado"
                      readonly
                    />
                    <button
                      class="fin-btn fin-btn--ghost fin-btn--sm"
                      type="button"
                      (click)="simulateCertUpload()">
                      <i class="pi pi-upload"></i> Subir
                    </button>
                  </div>
                  <div class="fin-hint">
                    Certificado emitido por ARCA para firmar los comprobantes.
                  </div>
                </div>

                <!-- ARCA: Ambiente -->
                <div class="fin-field">
                  <label class="fin-label">Ambiente</label>
                  <div class="fin-selbox">
                    <select class="fin-select" [(ngModel)]="arcaCreds.ambiente">
                      <option value="Producción">Producción</option>
                      <option value="Homologación">Homologación</option>
                    </select>
                    <span class="fin-select-icon"><i class="pi pi-angle-down"></i></span>
                  </div>
                </div>
              }

              @if (selectedProvider() === 'COLPPY') {
                <!-- COLPPY: API Key -->
                <div class="fin-field">
                  <label class="fin-label">
                    API Key Colppy <span class="fin-req">obligatorio</span>
                  </label>
                  <input
                    class="fin-input fin-input--mono"
                    type="password"
                    [(ngModel)]="colppyCreds.apiKey"
                    placeholder="clpy_live_…"
                  />
                </div>

                <!-- COLPPY: Usuario de integración -->
                <div class="fin-field">
                  <label class="fin-label">
                    Usuario de integración <span class="fin-req">obligatorio</span>
                  </label>
                  <input
                    class="fin-input"
                    type="text"
                    [(ngModel)]="colppyCreds.usuario"
                    placeholder="integracion@lab.com"
                  />
                </div>
              }

            </div>
          </div>
        }

        <!-- NONE banner -->
        @if (selectedProvider() === 'NONE') {
          <div class="fin-banner fin-banner--warn" style="margin-bottom:18px">
            <div class="fin-banner__ico">
              <i class="pi pi-info-circle"></i>
            </div>
            <div class="fin-banner__txt">
              <div class="fin-banner__title">Sin facturación electrónica</div>
              <div class="fin-banner__desc">
                Con esta configuración, todos los cobros emiten Factura X (recibo interno
                con número correlativo). No se generan comprobantes fiscales.
              </div>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="fin-config__actions">
          <button
            class="fin-btn fin-btn--ghost"
            type="button"
            [disabled]="saving()"
            (click)="discard()">
            Descartar cambios
          </button>
          <p-button
            label="Guardar configuración"
            icon="pi pi-check"
            severity="primary"
            [loading]="saving()"
            [disabled]="saving()"
            (onClick)="save()"
          />
        </div>

      }
    </div>
  `,
  styles: [`
    .fin-config {
      padding: var(--space-2) 0;
    }
    .fin-card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
    }
    .fin-card--pad { padding: var(--space-5) var(--space-6); }

    .fin-section-cap {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #7c8092;
      margin-bottom: 12px;
    }

    /* Provider picker */
    .fin-provider-pick {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .fin-prov-card {
      border: 1.5px solid #e8e9f0;
      border-radius: 14px;
      padding: 14px;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      background: #f5f6f9;
    }
    .fin-prov-card:hover { border-color: #c7caf6; background: #f0f1ff; }
    .fin-prov-card--selected {
      border-color: #4b4ddb;
      background: #eef0ff;
    }
    .fin-prov-card__top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .fin-prov-card__ico {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      color: #4b4ddb;
      box-shadow: 0 1px 3px rgba(28,30,55,.1);
    }
    .fin-prov-card__name {
      font-weight: 600;
      font-size: 14px;
      color: #22243a;
      flex: 1;
    }
    .fin-prov-card__desc {
      font-size: 12px;
      color: #7c8092;
      line-height: 1.4;
    }
    .fin-prov-radio {
      width: 16px; height: 16px;
      border-radius: 50%;
      border: 2px solid #c7caf6;
      background: #fff;
      flex-shrink: 0;
    }
    .fin-prov-radio--checked {
      border-color: #4b4ddb;
      background: #4b4ddb;
      box-shadow: inset 0 0 0 3px #fff;
    }

    /* Form */
    .fin-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .fin-field { display: flex; flex-direction: column; gap: 4px; }
    .fin-label { font-size: 13px; font-weight: 600; color: #22243a; }
    .fin-req { font-weight: 400; color: #7c8092; font-size: 11px; margin-left: 4px; }
    .fin-hint { font-size: 12px; color: #7c8092; }

    .fin-input {
      height: 36px;
      border-radius: 10px;
      border: 1.5px solid #e8e9f0;
      padding: 0 10px;
      font-size: 14px;
      color: #22243a;
      background: #f9fafc;
      outline: none;
      transition: border-color .15s;
      width: 100%;
      box-sizing: border-box;
    }
    .fin-input:focus { border-color: #4b4ddb; background: #fff; }
    .fin-input--mono { font-family: 'Roboto Mono', monospace; }

    .fin-selbox { position: relative; }
    .fin-select {
      appearance: none;
      width: 100%;
      height: 36px;
      padding: 0 32px 0 10px;
      border: 1.5px solid #e8e9f0;
      border-radius: 10px;
      font-size: 14px;
      color: #22243a;
      background: #f9fafc;
      cursor: pointer;
    }
    .fin-select:disabled { cursor: not-allowed; color: #7c8092; }
    .fin-select-icon {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      pointer-events: none; color: #7c8092;
    }

    .fin-cert-row { display: flex; gap: 8px; }
    .fin-cert-row .fin-input { flex: 1; }

    /* Banner */
    .fin-banner {
      display: flex;
      gap: 12px;
      border-radius: 12px;
      padding: 14px 16px;
      border: 1px solid;
    }
    .fin-banner--warn {
      background: #fcf1dd;
      border-color: #e9cc92;
      color: #b5740c;
    }
    .fin-banner__ico { font-size: 18px; margin-top: 2px; }
    .fin-banner__title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
    .fin-banner__desc { font-size: 13px; line-height: 1.45; }

    /* Actions */
    .fin-config__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .fin-btn {
      height: 36px;
      padding: 0 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background .15s, opacity .15s;
    }
    .fin-btn--ghost {
      background: transparent;
      color: #4a4d63;
      border: 1.5px solid #e8e9f0;
    }
    .fin-btn--ghost:hover { background: #f5f6f9; }
    .fin-btn--ghost:disabled { opacity: .5; cursor: not-allowed; }
    .fin-btn--sm { height: 30px; padding: 0 10px; font-size: 13px; }
  `],
})
export class ConfigFiscalPage implements OnInit {
  private readonly store = inject(Store);
  private readonly tokenService = inject(TokenService);

  // ── Store signals ──────────────────────────────────────────────────────────
  readonly saving = this.store.selectSignal(selectFiscalSaving);
  readonly existingConfig = this.store.selectSignal(selectFiscalConfig);

  // ── Auth / Tenant ──────────────────────────────────────────────────────────
  /** true if the current user has the SAAS_ADMIN role (defensive fallback) */
  readonly isSaasAdmin = computed(() =>
    this.tokenService.getRoles().includes('SAAS_ADMIN'),
  );

  /**
   * Current tenant ID from the JWT payload.
   * NOTE: only a single tenant is available here; multi-tenant admin selection
   * would require a separate API for tenant listing — deferred to a future ticket.
   */
  readonly tenantId = computed(() => {
    const id = this.tokenService.getTenantId();
    return id ?? '—';
  });

  // ── Provider picker state ──────────────────────────────────────────────────
  readonly providerMeta = PROVIDER_META;
  readonly providerKeys: FiscalProvider[] = PROVIDERS_LIST;

  readonly selectedProvider = signal<FiscalProvider>('NONE');

  // ── Reactive prefill: seeds the form when the store resolves the config ────
  // Runs in injection context (field initializer) so Angular's effect() works.
  private readonly _prefillEffect = effect(() => {
    const c = this.existingConfig();
    if (!c) return;
    this.selectedProvider.set(c.provider);
    this.invoicePointOfSale = c.invoicePointOfSale ?? '';
    this._parseConfigJson(c.provider, (c as any).configJson ?? null);
  });

  // ── Credential form state ──────────────────────────────────────────────────
  /** Shared field: punto de venta (invoicePointOfSale) */
  invoicePointOfSale = '';

  /** ARCA-specific credentials */
  arcaCreds: ArcaCredentials = {
    cuit: '',
    cert: '',
    ambiente: 'Producción',
  };

  /** Colppy-specific credentials */
  colppyCreds: ColppyCredentials = {
    apiKey: '',
    usuario: '',
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const tenantIdRaw = this.tokenService.getTenantId();
    if (tenantIdRaw) {
      this.store.dispatch(loadFiscalConfig({ tenantId: Number(tenantIdRaw) }));
    }
    // Form prefill is driven reactively via _prefillEffect (field initializer above),
    // which fires when existingConfig() becomes non-null after the store loads.
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  selectProvider(key: FiscalProvider): void {
    this.selectedProvider.set(key);
  }

  /** Simulate a file upload by setting a mock filename (real upload is out of scope) */
  simulateCertUpload(): void {
    this.arcaCreds = { ...this.arcaCreds, cert: 'cert-arca-2026.pem' };
  }

  /** Reset form to the last saved state from the store */
  discard(): void {
    const config = this.existingConfig();
    if (config) {
      this.selectedProvider.set(config.provider);
      this.invoicePointOfSale = config.invoicePointOfSale ?? '';
      this._parseConfigJson(config.provider, (config as any).configJson ?? null);
    } else {
      this.selectedProvider.set('NONE');
      this.invoicePointOfSale = '';
      this.arcaCreds = { cuit: '', cert: '', ambiente: 'Producción' };
      this.colppyCreds = { apiKey: '', usuario: '' };
    }
  }

  /** Dispatch saveFiscalConfig with the assembled body */
  save(): void {
    const provider = this.selectedProvider();
    const tenantIdRaw = this.tokenService.getTenantId();
    const targetTenantId = tenantIdRaw ? Number(tenantIdRaw) : 0;

    const configJson = this._buildConfigJson(provider);

    this.store.dispatch(
      saveFiscalConfig({
        body: {
          targetTenantId,
          provider,
          invoicePointOfSale: provider !== 'NONE' ? this.invoicePointOfSale : undefined,
          configJson: configJson ?? undefined,
        },
      }),
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  /**
   * Builds the `configJson` string for the selected provider.
   * - ARCA: { cuit, cert, ambiente }
   * - COLPPY: { apiKey, usuario }
   * - NONE: null (no credentials)
   */
  private _buildConfigJson(provider: FiscalProvider): string | null {
    if (provider === 'ARCA') {
      return JSON.stringify({
        cuit: this.arcaCreds.cuit,
        cert: this.arcaCreds.cert,
        ambiente: this.arcaCreds.ambiente,
      });
    }
    if (provider === 'COLPPY') {
      return JSON.stringify({
        apiKey: this.colppyCreds.apiKey,
        usuario: this.colppyCreds.usuario,
      });
    }
    return null;
  }

  /**
   * Parses a configJson string from the backend and populates local form state.
   */
  private _parseConfigJson(provider: FiscalProvider, raw: string | null): void {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (provider === 'ARCA') {
        this.arcaCreds = {
          cuit: parsed.cuit ?? '',
          cert: parsed.cert ?? '',
          ambiente: parsed.ambiente ?? 'Producción',
        };
      } else if (provider === 'COLPPY') {
        this.colppyCreds = {
          apiKey: parsed.apiKey ?? '',
          usuario: parsed.usuario ?? '',
        };
      }
    } catch {
      // silently ignore malformed configJson
    }
  }
}
