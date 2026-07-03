import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { InsurerComplete, InsurerSummary, InsurerTypeCode, SpecificData, humanizeInsurerType } from '../models/insurer.model';
import { PlanComplete } from '../models/plan.model';
import { Agreement } from '../models/agreement.model';
import { InsurerContactInfo, ContactTypeCode } from '../models/contact-info.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest, ObraSocialPageResult } from '../models/obra-social-page.model';
import { WizardCreate } from '../models/wizard.model';
import { NBU_VERSIONS } from './mock-data';

// ── Shapes crudos del backend (módulo coverages) ────────────────────────────

interface InsurerResponse {
  id: number; code: string; name: string; acronym: string;
  insurerType: InsurerTypeCode; insurerTypeName: string;
  description: string | null; authorizationUrl: string | null;
  cuit: string | null; copayPolicy: string | null; acceptedPaymentMethods: string | null;
  active: boolean;
}
interface PagedInsurerResponse {
  content: InsurerResponse[]; totalElements: number; totalPages: number; page: number; size: number;
}
interface AgreementResponse {
  id: number; insurerPlanId: number; versionNbu: number | null;
  ubValue: number; validFromDate: string; validToDate: string | null; active: boolean;
}
interface PlanResponse {
  id: number; insurerId: number; code: string; acronym: string | null; name: string;
  description: string | null; iva: number | null; active: boolean;
  currentAgreement: AgreementResponse | null;
}
interface ContactResponse {
  id: number; contactType: ContactTypeCode; contact: string; active: boolean;
}
interface InsurerCompleteResponse extends InsurerResponse {
  contacts: ContactResponse[];
  plans: PlanResponse[];
}

/**
 * Servicio de Obras Sociales — conectado al backend (módulo coverages).
 *
 * Endpoints reales:
 *   GET /api/v1/coverages/insurers               → listado paginado (q/state/insurerType)
 *   GET /api/v1/coverages/insurers/{id}/complete → detalle con contactos + planes (con convenio vigente)
 *   GET /api/v1/coverages/insurer-types          → catálogo de tipos
 *   GET /api/v1/coverages/contact-types          → catálogo de tipos de contacto
 *
 * Pendiente de backend (no hay endpoint hoy): el alta por wizard y el histórico
 * de convenios (versiones NBU). `createFromWizard` queda en memoria como stub y
 * `getNbuVersions` devuelve un catálogo fijo hasta que exista el endpoint.
 */
@Injectable({ providedIn: 'root' })
export class ObraSocialService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/coverages';

  // ── lectura (backend real) ────────────────────────────────────────────────

  search(req: ObraSocialPageRequest): Observable<ObraSocialPageResult> {
    let params = new HttpParams()
      .set('state', req.state)
      .set('page', req.page)
      .set('size', req.size);
    if (req.q?.trim()) params = params.set('q', req.q.trim());
    if (req.insurerType) params = params.set('insurerType', req.insurerType);

    return this.http.get<PagedInsurerResponse>(`${this.base}/insurers`, { params }).pipe(
      map((res) => ({
        content: res.content.map((i): InsurerSummary => ({
          id: i.id, code: i.code, acronym: i.acronym, name: i.name,
          insurerType: i.insurerType, insurerTypeName: i.insurerTypeName, active: i.active,
        })),
        totalElements: res.totalElements,
        totalPages: res.totalPages,
        page: res.page,
        size: res.size,
      })),
    );
  }

  getCompleteById(id: number): Observable<InsurerComplete> {
    return this.http
      .get<InsurerCompleteResponse>(`${this.base}/insurers/${id}/complete`)
      .pipe(map((r) => this.toComplete(r)));
  }

  getInsurerTypes(): Observable<InsurerType[]> {
    return this.http.get<InsurerType[]>(`${this.base}/insurer-types`);
  }

  getContactTypes(): Observable<ContactType[]> {
    return this.http.get<ContactType[]>(`${this.base}/contact-types`);
  }

  /** Sin endpoint de versiones NBU todavía: catálogo fijo. */
  getNbuVersions(): Observable<NbuVersion[]> { return of(NBU_VERSIONS.map((x) => ({ ...x }))); }

  // ── alta por wizard (backend real: POST /coverages/wizard) ─────────────────

  /**
   * Alta atómica de obra social + planes (con convenio) + contactos contra el
   * endpoint real del wizard. Antes era un stub en memoria (no persistía ni se
   * veía en la tabla/atención). Devuelve el detalle completo recién creado.
   */
  createFromWizard(payload: WizardCreate): Observable<InsurerComplete> {
    const sd = payload.insurer.specificData;
    const body = {
      insurer: {
        code: payload.insurer.code,
        name: payload.insurer.name,
        acronym: payload.insurer.acronym,
        insurerType: payload.insurer.insurerType,
        description: payload.insurer.description ?? null,
        authorizationUrl: payload.insurer.authorizationUrl ?? null,
        cuit: sd?.socialHealth?.cuit ?? sd?.privateHealth?.cuit ?? null,
        copayPolicy: sd?.privateHealth?.copayPolicy ?? null,
        acceptedPaymentMethods: sd?.selfPay?.acceptedPaymentMethods ?? null,
      },
      contacts: payload.contacts.map((c) => ({ contact: c.contact, contactType: c.contactType })),
      plans: payload.plans.map((pw) => ({
        code: pw.plan.code,
        acronym: pw.plan.acronym,
        name: pw.plan.name,
        description: pw.plan.description ?? null,
        iva: pw.plan.iva,
        versionNbu: pw.agreement.versionNbu,
        ubValue: pw.agreement.ubValue,
        validFromDate: pw.agreement.validFromDate,
      })),
    };
    return this.http.post<{ insurerId: number }>(`${this.base}/wizard`, body).pipe(
      switchMap((res) => this.getCompleteById(res.insurerId)),
    );
  }

  // ── mapeo backend → modelo de UI ──────────────────────────────────────────

  private toComplete(r: InsurerCompleteResponse): InsurerComplete {
    return {
      id: r.id, code: r.code, name: r.name, acronym: r.acronym,
      insurerType: r.insurerType, insurerTypeName: r.insurerTypeName,
      description: r.description ?? undefined,
      authorizationUrl: r.authorizationUrl ?? undefined,
      active: r.active,
      specificData: this.toSpecificData(r),
      plans: (r.plans ?? []).map((p) => this.toPlan(p, r.name)),
      contacts: (r.contacts ?? []).map((c) => ({
        id: c.id, insurerId: r.id, contactType: c.contactType, contact: c.contact,
        isActive: c.active ?? true,
      })),
    };
  }

  private toSpecificData(r: InsurerResponse): SpecificData | null {
    switch (r.insurerType) {
      case 'SOCIAL':   return { socialHealth: { cuit: r.cuit ?? '' } };
      case 'PRIVATE':  return { privateHealth: { cuit: r.cuit ?? '', copayPolicy: r.copayPolicy ?? '' } };
      default:         return null;
    }
  }

  private toPlan(p: PlanResponse, insurerName: string): PlanComplete {
    const ag = p.currentAgreement;
    return {
      id: p.id, insurerId: p.insurerId, insurerName,
      code: p.code, acronym: p.acronym ?? '', name: p.name,
      description: p.description ?? undefined, isActive: p.active, iva: p.iva ?? 0,
      actualAgreements: ag
        ? [{
            id: ag.id, insurerPlanId: ag.insurerPlanId, insurerPlanName: p.name,
            versionNbu: ag.versionNbu ?? 0, ubValue: ag.ubValue,
            validFromDate: ag.validFromDate, validToDate: ag.validToDate ?? null,
          }]
        : [],
    };
  }
}
