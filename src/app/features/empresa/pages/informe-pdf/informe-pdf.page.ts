import {
  ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import {
  loadReportTemplate, saveReportTemplateText, uploadReportImage, deleteReportImage,
  loadAuthorizerCandidates,
} from '../../store/empresa.actions';
import {
  selectReportTemplate, selectReportTemplatePending, selectAuthorizerCandidates,
} from '../../store/empresa.selectors';
import { ReportTemplateApiService } from '../../services/report-template-api.service';
import { EmployeeService } from '../../../sucursales/services/employee.service';
import { InformePdfPreviewComponent } from './components/informe-pdf-preview.component';
import { InformePdfSaveBus } from './informe-pdf-save.bus';

/**
 * Configuración del informe PDF (Empresa) cableada al backend vía el store NgRx.
 * El usuario sube/quita el logo del encabezado y la marca de agua (persistidos en el back),
 * y edita el enlace del pie y la leyenda de acreditación (texto). La vista previa muestra
 * la primera página con datos de ejemplo y refleja la config en vivo.
 *
 * "Guardar cambios" vive en el header de Empresa (componente padre) vía `InformePdfSaveBus`:
 * esta page registra su handler de guardado (solo persiste el texto) y publica su estado `dirty`.
 * Las imágenes persisten de forma inmediata al subir/quitar (no dependen de "Guardar").
 */
@Component({
  selector: 'emp-informe-pdf-page',
  standalone: true,
  imports: [
    ButtonModule, DialogModule, InputTextModule, TextareaModule, InformePdfPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-rpt">
      <!-- ===== COLUMNA CONFIG ===== -->
      <div class="emp-rpt__config">
        <!-- Imagen del encabezado -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Imagen del encabezado</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Logo que aparece arriba a la izquierda en cada página del informe.
          </p>
          <div class="emp-rpt__current">
            <span class="emp-rpt__preview-box" [class.is-empty]="!headerObjectUrl()">
              @if (headerObjectUrl(); as src) {
                <img [src]="src" alt="Logo del encabezado" />
              } @else {
                <span class="emp-rpt__empty"><i class="pi pi-image"></i> Sin logo</span>
              }
            </span>
          </div>
          <div class="emp-rpt__actions">
            <p-button label="Subir imagen" icon="pi pi-upload" severity="secondary" [text]="true"
                      [disabled]="pending()" (onClick)="headerFile.click()" />
            @if (reportTemplate()?.hasHeaderLogo) {
              <p-button label="Quitar" icon="pi pi-trash" severity="danger" [text]="true"
                        [disabled]="pending()" (onClick)="removeImage('header')" />
            }
          </div>
          <input #headerFile type="file" accept="image/*" hidden
                 (change)="onUpload('header', headerFile)" />
        </section>

        <!-- Imagen de fondo (marca de agua) -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Imagen de fondo</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Marca de agua centrada, detrás del contenido (opacidad baja).
          </p>
          <div class="emp-rpt__current">
            <span class="emp-rpt__preview-box" [class.is-empty]="!bgObjectUrl()">
              @if (bgObjectUrl(); as src) {
                <img [src]="src" alt="Marca de agua" />
              } @else {
                <span class="emp-rpt__empty"><i class="pi pi-image"></i> Sin fondo</span>
              }
            </span>
          </div>
          <div class="emp-rpt__actions">
            <p-button label="Subir imagen" icon="pi pi-upload" severity="secondary" [text]="true"
                      [disabled]="pending()" (onClick)="bgFile.click()" />
            @if (reportTemplate()?.hasWatermark) {
              <p-button label="Quitar" icon="pi pi-trash" severity="danger" [text]="true"
                        [disabled]="pending()" (onClick)="removeImage('watermark')" />
            }
          </div>
          <input #bgFile type="file" accept="image/*" hidden (change)="onUpload('watermark', bgFile)" />
        </section>

        <!-- Pie de página -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Pie de página</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Enlace que se muestra centrado en el pie del informe.
          </p>
          <div class="pat-form__field">
            <label class="pat-form__label" for="rpt-footer">Enlace</label>
            <input pInputText id="rpt-footer" class="pat-form__input" placeholder="https://..."
                   [value]="footerLink()" (input)="footerLink.set(asValue($event))" />
          </div>
        </section>

        <!-- Leyenda de acreditación -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Leyenda de acreditación</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Texto que aparece bajo el encabezado, sobre la línea turquesa.
          </p>
          <div class="pat-form__field">
            <textarea pTextarea id="rpt-legend" class="pat-form__input" rows="3"
                      [value]="legend()" (input)="legend.set(asValue($event))"></textarea>
          </div>
        </section>

        <!-- Director técnico -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Director técnico</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Se imprime en el bloque de firmas de cada informe nuevo. La sucursal puede definir uno propio.
          </p>
          <div class="pat-form__field">
            <label class="pat-form__label" for="rpt-director-name">Nombre y apellido</label>
            <input pInputText id="rpt-director-name" class="pat-form__input"
                   [value]="directorName()" (input)="directorName.set(asValue($event))" />
          </div>
          <div class="pat-form__field">
            <label class="pat-form__label" for="rpt-director-registration">Matrícula</label>
            <input pInputText id="rpt-director-registration" class="pat-form__input"
                   [value]="directorRegistration()" (input)="directorRegistration.set(asValue($event))" />
          </div>
        </section>

        <!-- Firmante autorizante -->
        <section class="pat-form__card">
          <div class="pat-form__card-header"><span>Firmante autorizante</span></div>
          <p class="ui-text-sm ui-text-muted" style="margin: 0 0 var(--space-4)">
            Administrador cuya firma aparece en "Autorizado por" en cada informe.
          </p>
          <div class="pat-form__field">
            <label class="pat-form__label" for="rpt-signer">Administrador</label>
            <select pInputText id="rpt-signer" class="pat-form__input"
                    [value]="signerId() != null ? signerId() + '' : ''"
                    (change)="onSignerChange($event)">
              <option value="">Sin firmante</option>
              @for (c of candidates(); track c.employeeId) {
                <option [value]="c.employeeId">{{ c.fullName }}</option>
              }
            </select>
          </div>
          @if (selectedSignerHasNoSignature()) {
            <p class="emp-rpt__hint" style="margin: var(--space-2) 0 0">
              <i class="pi pi-exclamation-triangle"></i>
              Este firmante no tiene firma cargada; el informe mostrará "-".
            </p>
          }
        </section>
      </div>

      <!-- ===== COLUMNA PREVIEW ===== -->
      <aside class="emp-rpt__preview">
        <div class="emp-rpt__preview-head">
          <h4>Vista previa</h4>
          <p-button label="Ver vista expandida" icon="pi pi-window-maximize"
                    severity="secondary" [text]="true" (onClick)="expandedOpen.set(true)" />
        </div>
        <emp-informe-pdf-preview
          [headerSrc]="headerObjectUrl()"
          [bgSrc]="bgObjectUrl()"
          [footerLink]="footerLink()"
          [legend]="legend()"
          [authorizerSignatureSrc]="signerSignature()"
          [authorizerName]="signerName()"
          [authorizerRegistration]="signerRegistration()" />
        <p class="ui-text-muted ui-text-sm" style="margin-top: var(--space-3)">
          La vista previa muestra la primera página con datos de ejemplo. Los cambios se aplican a
          todas las páginas del informe generado.
        </p>
      </aside>
    </div>

    <!-- Vista expandida: mismo preview a mayor escala dentro de un modal. -->
    <p-dialog header="Vista previa del informe" [(visible)]="dialogVisible"
              [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
              [style]="{ width: '860px', maxWidth: '95vw' }"
              [breakpoints]="{ '960px': '100vw' }" styleClass="emp-rpt__dialog">
      <emp-informe-pdf-preview
        [headerSrc]="headerObjectUrl()"
        [bgSrc]="bgObjectUrl()"
        [footerLink]="footerLink()"
        [legend]="legend()"
        [authorizerSignatureSrc]="signerSignature()"
        [authorizerName]="signerName()"
        [authorizerRegistration]="signerRegistration()"
        [scale]="0.92" />
    </p-dialog>
  `,
  styles: [`
    :host { display: block; }
    .emp-rpt {
      display: grid; grid-template-columns: minmax(420px, 1.1fr) 1fr;
      gap: var(--space-6); align-items: start;
    }
    @media (max-width: 1024px) { .emp-rpt { grid-template-columns: 1fr; } }
    .emp-rpt__preview { position: sticky; top: 0; }
    .emp-rpt__preview-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-2); margin-bottom: var(--space-3);
    }
    .emp-rpt__preview-head h4 { margin: 0; }

    .emp-rpt__current { margin-bottom: var(--space-3); }
    .emp-rpt__preview-box {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 72px; padding: var(--space-3);
      border: 1.5px solid var(--ds-surface); border-radius: 8px; background: #fff;
    }
    .emp-rpt__preview-box.is-empty { background: var(--ds-bg); }
    .emp-rpt__preview-box img { max-height: 60px; max-width: 100%; object-fit: contain; }
    .emp-rpt__empty {
      display: inline-flex; align-items: center; gap: var(--space-2);
      font-size: 12.5px; color: var(--ds-text-muted);
    }
    .emp-rpt__actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
    .emp-rpt__hint {
      display: inline-flex; align-items: center; gap: var(--space-2);
      font-size: 12.5px; color: var(--ds-warning, #b7791f);
    }
  `],
})
export class InformePdfPage implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly api = inject(ReportTemplateApiService);
  private readonly employeeApi = inject(EmployeeService);
  private readonly saveBus = inject(InformePdfSaveBus);

  protected readonly reportTemplate = this.store.selectSignal(selectReportTemplate);
  protected readonly pending = this.store.selectSignal(selectReportTemplatePending);
  protected readonly candidates = this.store.selectSignal(selectAuthorizerCandidates);

  // Texto editable en vivo (se hidrata desde el store; "Guardar" persiste).
  // Inicial neutro ('') a propósito: NO sembrar branding de ningún tenant (p. ej. LCC)
  // antes de que el load traiga la config real. Un tenant sin config queda vacío (correcto).
  protected readonly footerLink = signal<string>('');
  protected readonly legend = signal<string>('');
  // Director técnico por defecto del tenant (nombre + matrícula). Se hidrata del server junto
  // con footer/legend y se persiste en el mismo PUT. Una sucursal puede sobreescribirlo.
  protected readonly directorName = signal<string>('');
  protected readonly directorRegistration = signal<string>('');
  // Firmante autorizante elegido (employeeId) o null = sin firmante. Se hidrata del server
  // junto con footer/legend y se persiste en el mismo PUT.
  protected readonly signerId = signal<number | null>(null);

  // Firma del autorizante elegido (base64 dataURL) para el preview. Se pide al endpoint de
  // empleados (que devuelve `signature`) cuando cambia signerId; null si no hay firma o sin elegir.
  protected readonly signerSignature = signal<string | null>(null);

  // Candidato elegido (para nombre/matrícula del preview y el aviso de "sin firma").
  protected readonly selectedCandidate = computed(() => {
    const id = this.signerId();
    return id == null ? null : this.candidates().find((c) => c.employeeId === id) ?? null;
  });
  protected readonly signerName = computed(() => this.selectedCandidate()?.fullName ?? null);
  protected readonly signerRegistration = computed(
    () => this.selectedCandidate()?.registration ?? null,
  );
  // Aviso suave: hay firmante elegido pero el candidato no tiene firma → el informe cae a "-".
  protected readonly selectedSignerHasNoSignature = computed(
    () => this.selectedCandidate()?.hasSignature === false,
  );

  private lastTemplateRef: unknown = null;

  // Object URLs de las imágenes del back. La imagen se pide vía HttpClient como blob (pasa por
  // el authTokenInterceptor → lleva el JWT) y se convierte a un object URL local que el <img>
  // sí puede renderizar sin auth. null cuando el tenant no tiene logo/watermark cargado.
  // Se revocan al reemplazarlos o en ngOnDestroy para evitar memory leaks.
  protected readonly headerObjectUrl = signal<string | null>(null);
  protected readonly bgObjectUrl = signal<string | null>(null);

  // Estado del modal de vista expandida.
  protected readonly expandedOpen = signal(false);
  protected get dialogVisible(): boolean { return this.expandedOpen(); }
  protected set dialogVisible(v: boolean) { this.expandedOpen.set(v); }

  // Snapshot del texto guardado para detectar cambios sin persistir.
  private readonly saved = signal(this.textSnapshot());
  protected readonly dirty = computed(() => this.textSnapshot() !== this.saved());

  constructor() {
    // Sincronizar con el store en cada nueva referencia de reportTemplate (carga inicial,
    // o recargas que dispara el store tras subir/quitar imagen o tras guardar el texto).
    //
    // Fix clobber-race: NO re-hidratamos footerLink/legend desde el server en cada cambio
    // de referencia. Si lo hiciéramos, un `saveReportTemplateText` exitoso (que produce una
    // referencia nueva) re-setearía los inputs mientras el usuario sigue tipeando durante el
    // PUT y le pisaría la edición. Por eso:
    //   (a) Carga inicial (firstLoad): hidratamos el texto + snapshot. El usuario aún no tocó nada.
    //   (b) Cambios posteriores: si el usuario tiene edición en curso (dirty), NO tocamos los
    //       inputs — solo movemos el snapshot `saved` al valor del server para que `dirty` se
    //       recalcule correctamente. Si NO está dirty (p. ej. tras un guardado limpio), re-hidratar
    //       es inocuo y deja el texto consistente con lo persistido por el back (normalizaciones
    //       incluidas).
    // Cada vez que cambia la referencia, re-sincronizamos las imágenes vía blob (ver
    // syncImages): si hasHeaderLogo/hasWatermark cambió, pedimos el blob fresco y generamos
    // un object URL nuevo (revocando el anterior). El effect solo DETECTA el cambio y delega
    // el side-effect async (el subscribe) a un método — no hacemos el subscribe inline en el
    // effect para no acoplar el ciclo de reactividad a la respuesta HTTP.
    effect(() => {
      const rt = this.reportTemplate();
      if (rt && rt !== this.lastTemplateRef) {
        const firstLoad = this.lastTemplateRef === null;
        this.lastTemplateRef = rt;
        this.syncImages(!!rt.hasHeaderLogo, !!rt.hasWatermark);

        const serverFooter = rt.footerLink ?? '';
        const serverLegend = rt.accreditationLegend ?? '';
        const serverSigner = rt.authorizedSignerEmployeeId ?? null;
        const serverDirectorName = rt.technicalDirectorName ?? '';
        const serverDirectorRegistration = rt.technicalDirectorRegistration ?? '';

        if (firstLoad || !this.dirty()) {
          // Sin edición pendiente del usuario: seguro re-hidratar inputs desde el server.
          this.footerLink.set(serverFooter);
          this.legend.set(serverLegend);
          this.signerId.set(serverSigner);
          this.directorName.set(serverDirectorName);
          this.directorRegistration.set(serverDirectorRegistration);
          this.saved.set(this.textSnapshot());
        } else {
          // Edición en curso: no pisar los inputs. Solo actualizar el snapshot al valor del
          // server para que `dirty` siga reflejando si lo tipeado difiere de lo guardado.
          this.saved.set(this.snapshotOf(
            serverFooter, serverLegend, serverSigner, serverDirectorName, serverDirectorRegistration,
          ));
        }
      }
    });

    // El botón "Guardar cambios" vive en el header de Empresa; el bus sincroniza dirty/save.
    this.saveBus.register(() => this.save());
    effect(() => this.saveBus.dirty.set(this.dirty()));

    // Firma del autorizante para el preview: cuando cambia el candidato elegido, pedimos su
    // empleado (que trae `signature` base64) y la mostramos. Sin elegir o sin firma → null ("-").
    // El effect solo DETECTA el cambio de id; el subscribe async se delega para no acoplar la
    // reactividad a la respuesta HTTP (mismo criterio que syncImages).
    effect(() => this.syncSignerSignature(this.selectedCandidate()));
  }

  ngOnInit(): void {
    this.store.dispatch(loadReportTemplate());
    this.store.dispatch(loadAuthorizerCandidates());
  }

  ngOnDestroy(): void {
    this.saveBus.register(null);
    this.saveBus.dirty.set(false);
    // Liberar los object URLs vivos para no filtrar memoria al destruir la page.
    this.setObjectUrl(this.headerObjectUrl, null);
    this.setObjectUrl(this.bgObjectUrl, null);
  }

  /**
   * Sincroniza las imágenes con el estado del back. Para cada imagen: si el back dice que
   * existe, pedimos el blob (vía HttpClient → lleva JWT) y lo convertimos en object URL nuevo;
   * si no existe, dejamos null. En ambos casos revocamos el object URL anterior.
   */
  private syncImages(hasHeaderLogo: boolean, hasWatermark: boolean): void {
    if (hasHeaderLogo) {
      this.api.getHeaderLogoBlob().subscribe({
        next: (blob) => this.setObjectUrl(this.headerObjectUrl, URL.createObjectURL(blob)),
        error: () => this.setObjectUrl(this.headerObjectUrl, null),
      });
    } else {
      this.setObjectUrl(this.headerObjectUrl, null);
    }

    if (hasWatermark) {
      this.api.getWatermarkBlob().subscribe({
        next: (blob) => this.setObjectUrl(this.bgObjectUrl, URL.createObjectURL(blob)),
        error: () => this.setObjectUrl(this.bgObjectUrl, null),
      });
    } else {
      this.setObjectUrl(this.bgObjectUrl, null);
    }
  }

  /** Asigna un object URL al signal revocando el anterior si existía (evita memory leak). */
  private setObjectUrl(target: { (): string | null; set(v: string | null): void }, next: string | null): void {
    const prev = target();
    if (prev && prev !== next) URL.revokeObjectURL(prev);
    target.set(next);
  }

  protected onUpload(target: 'header' | 'watermark', input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.store.dispatch(uploadReportImage({ target, file }));
  }

  protected removeImage(target: 'header' | 'watermark'): void {
    this.store.dispatch(deleteReportImage({ target }));
  }

  protected onSignerChange(e: Event): void {
    const raw = (e.target as HTMLSelectElement).value;
    this.signerId.set(raw ? Number(raw) : null);
  }

  protected save(): void {
    this.store.dispatch(
      saveReportTemplateText({
        payload: {
          footerLink: this.footerLink() || null,
          accreditationLegend: this.legend() || null,
          authorizedSignerEmployeeId: this.signerId(),
          technicalDirectorName: this.directorName().trim() || null,
          technicalDirectorRegistration: this.directorRegistration().trim() || null,
        },
      }),
    );
  }

  protected asValue(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  /**
   * Trae la firma del candidato elegido para el preview. Sin candidato (o sin firma cargada)
   * dejamos null → el preview muestra "-". El base64 NO viaja en el listado por seguridad:
   * se pide al endpoint admin `/{id}/signature`, y sólo cuando el candidato declara `hasSignature`.
   */
  private syncSignerSignature(candidate: { employeeId: number; hasSignature: boolean } | null): void {
    if (!candidate || !candidate.hasSignature) {
      this.signerSignature.set(null);
      return;
    }
    const wanted = candidate.employeeId;
    this.employeeApi.getSignature(wanted).subscribe({
      next: ({ signature }) => {
        // Evitar pisar el preview si el usuario ya cambió de firmante mientras llegaba la respuesta.
        if (this.signerId() === wanted) {
          this.signerSignature.set(signature ?? null);
        }
      },
      error: () => {
        if (this.signerId() === wanted) this.signerSignature.set(null);
      },
    });
  }

  private textSnapshot(): string {
    return this.snapshotOf(
      this.footerLink(), this.legend(), this.signerId(),
      this.directorName(), this.directorRegistration(),
    );
  }

  private snapshotOf(
    footer: string, legend: string, signerId: number | null,
    directorName: string, directorRegistration: string,
  ): string {
    return JSON.stringify({
      f: footer, l: legend, s: signerId, dn: directorName, dr: directorRegistration,
    });
  }
}
