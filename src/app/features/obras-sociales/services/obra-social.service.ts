import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { InsurerComplete, InsurerSummary, humanizeInsurerType } from '../models/insurer.model';
import { PlanComplete } from '../models/plan.model';
import { Agreement } from '../models/agreement.model';
import { InsurerContactInfo } from '../models/contact-info.model';
import { InsurerType, NbuVersion } from '../models/catalogs.model';
import { ContactType } from '../models/contact-info.model';
import { ObraSocialPageRequest, ObraSocialPageResult } from '../models/obra-social-page.model';
import { WizardCreate } from '../models/wizard.model';
import { MOCK_INSURERS, INSURER_TYPES, NBU_VERSIONS, CONTACT_TYPES } from './mock-data';

/**
 * Servicio MOCK de Obras Sociales.
 * Mantiene un array en memoria (clon del seed) → persiste durante la sesión.
 * Para enchufar el backend: reemplazar cada cuerpo `of(...)` por `this.http.*`
 * (aplicar la skill `ngrx-backend-request`). Las firmas no cambian.
 */
@Injectable({ providedIn: 'root' })
export class ObraSocialService {
  private readonly db: InsurerComplete[] = MOCK_INSURERS.map((o) => structuredClone(o));
  private seq = 10_000;
  private nextId(): number { return ++this.seq; }

  private toSummary(o: InsurerComplete): InsurerSummary {
    return {
      id: o.id, code: o.code, acronym: o.acronym, name: o.name,
      insurerType: o.insurerType, insurerTypeName: o.insurerTypeName, active: o.active,
    };
  }

  search(req: ObraSocialPageRequest): Observable<ObraSocialPageResult> {
    let rows = this.db.slice();
    if (req.state === 'active') rows = rows.filter((o) => o.active);
    else if (req.state === 'inactive') rows = rows.filter((o) => !o.active);
    if (req.insurerType) rows = rows.filter((o) => o.insurerType === req.insurerType);
    if (req.q?.trim()) {
      const q = req.q.trim().toLowerCase();
      rows = rows.filter((o) =>
        o.name.toLowerCase().includes(q) ||
        o.acronym.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q));
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const totalElements = rows.length;
    const { page, size } = req;
    const start = page * size;
    const content = rows.slice(start, start + size).map((o) => this.toSummary(o));
    return of({ content, totalElements, totalPages: size ? Math.ceil(totalElements / size) : 0, page, size });
  }

  getCompleteById(id: number): Observable<InsurerComplete> {
    const found = this.db.find((o) => o.id === id);
    if (!found) {
      return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
    }
    return of(structuredClone(found));
  }

  createFromWizard(payload: WizardCreate): Observable<InsurerComplete> {
    const insurerId = this.nextId();
    const plans: PlanComplete[] = payload.plans.map((pw) => {
      const planId = this.nextId();
      const agreement: Agreement = {
        id: this.nextId(), insurerPlanId: planId, insurerPlanName: pw.plan.name,
        versionNbu: pw.agreement.versionNbu, ubValue: pw.agreement.ubValue,
        validFromDate: pw.agreement.validFromDate, validToDate: null,
      };
      return {
        id: planId, insurerId, insurerName: payload.insurer.name,
        code: pw.plan.code, acronym: pw.plan.acronym, name: pw.plan.name,
        description: pw.plan.description, isActive: true, iva: pw.plan.iva,
        actualAgreements: [agreement],
      };
    });
    const contacts: InsurerContactInfo[] = payload.contacts.map((c) => ({
      id: this.nextId(), insurerId, contactType: c.contactType, contact: c.contact, isActive: true,
    }));
    const created: InsurerComplete = {
      id: insurerId, code: payload.insurer.code, name: payload.insurer.name,
      acronym: payload.insurer.acronym, insurerType: payload.insurer.insurerType,
      insurerTypeName: humanizeInsurerType(payload.insurer.insurerType),
      description: payload.insurer.description, authorizationUrl: payload.insurer.authorizationUrl,
      active: true, specificData: payload.insurer.specificData, plans, contacts,
    };
    this.db.push(created);
    return of(structuredClone(created));
  }

  getInsurerTypes(): Observable<InsurerType[]> { return of(INSURER_TYPES.map((x) => ({ ...x }))); }
  getNbuVersions(): Observable<NbuVersion[]> { return of(NBU_VERSIONS.map((x) => ({ ...x }))); }
  getContactTypes(): Observable<ContactType[]> { return of(CONTACT_TYPES.map((x) => ({ ...x }))); }
}
