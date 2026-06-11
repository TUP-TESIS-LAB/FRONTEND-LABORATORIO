import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import type { Sample } from '../../models/sample.model';
import type { TransitoDest } from '../../models/transito.model';
import { MockSamplesService } from '../../services/mock-samples.service';
import { TransitoLotesService } from '../../services/transito-lotes.service';
import { TransitoScanBarComponent } from '../../components/transito/transito-scan-bar/transito-scan-bar.component';
import { BulkActionsBarComponent } from '../../components/transito/bulk-actions-bar/bulk-actions-bar.component';
import { LoteCardComponent } from '../../components/transito/lote-card/lote-card.component';
import { RecommendedGroupCardComponent } from '../../components/transito/recommended-group-card/recommended-group-card.component';
import { ConfirmSendAllDialogComponent } from '../../components/transito/confirm-send-all-dialog/confirm-send-all-dialog.component';
import { CURRENT_BRANCH } from '../../data/catalogs';

@Component({
  selector: 'app-transito-page',
  standalone: true,
  imports: [
    ToastModule, TransitoScanBarComponent, BulkActionsBarComponent,
    LoteCardComponent, RecommendedGroupCardComponent, ConfirmSendAllDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './transito.page.html',
  styleUrl: './transito.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitoPage {
  protected readonly service = inject(TransitoLotesService);
  private readonly samplesService = inject(MockSamplesService);
  private readonly messages = inject(MessageService);

  protected readonly flashId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);

  protected readonly activeLoteNumber = computed(() => {
    const id = this.service.activeLoteId();
    if (!id) return null;
    const idx = this.service.lotes().findIndex(l => l.id === id);
    return idx >= 0 ? idx + 1 : null;
  });

  protected readonly sendAllBreakdown = computed(() => {
    const groups = this.service.groups();
    let enProceso = 0, enTransito = 0;
    for (const g of groups) {
      if (g.branch === CURRENT_BRANCH) enProceso += g.sampleIds.length;
      else enTransito += g.sampleIds.length;
    }
    return { enProceso, enTransito, groupsCount: groups.length };
  });

  samplesOf(ids: string[]): Sample[] {
    const all = this.samplesService.samples();
    const set = new Set(ids);
    return all.filter(s => set.has(s.id));
  }

  loteNumber(loteId: string): number {
    return this.service.lotes().findIndex(l => l.id === loteId) + 1;
  }

  onScanEnter(code: string): void {
    const result = this.service.scan(code);
    if (result.outcome === 'added' && result.matchedId) {
      this.flashId.set(result.matchedId);
      setTimeout(() => this.flashId.set(null), 1100);
    } else if (result.outcome === 'duplicate') {
      this.messages.add({
        severity: 'warn',
        summary: `Ya está en Lote ${result.duplicateLoteNumber}`,
        life: 3800,
      });
    }
  }

  onSendAllClick(): void {
    if (this.service.groups().length === 0) return;
    this.confirmOpen.set(true);
  }

  async onConfirmSendAll(): Promise<void> {
    this.confirmOpen.set(false);
    const total = this.sendAllBreakdown().enProceso + this.sendAllBreakdown().enTransito;
    const result = await this.service.sendAll();
    this.messages.add({
      severity: 'success',
      summary: `${total} muestras enviadas según la recomendación`,
      detail: `${result.enProceso} en proceso · ${result.enTransito} en tránsito`,
      life: 3800,
    });
  }

  onCreateLote(): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    const id = this.service.createLote(ids);
    const n = this.loteNumber(id);
    this.messages.add({
      severity: 'success',
      summary: `Lote ${n} temporal creado · ${ids.length} muestras`,
      detail: 'Asignale destino y envialo cuando quieras',
      life: 3800,
    });
  }

  onAddToLote(loteId: string): void {
    const ids = Array.from(this.service.sel());
    if (ids.length === 0) return;
    this.service.addToLote(loteId, ids);
    this.messages.add({
      severity: 'info',
      summary: `${ids.length} muestras → Lote ${this.loteNumber(loteId)}`,
      life: 3800,
    });
  }

  onDissolveLote(loteId: string): void {
    const n = this.loteNumber(loteId);
    const count = this.service.lotes().find(l => l.id === loteId)?.sampleIds.length ?? 0;
    this.service.dissolveLote(loteId);
    this.messages.add({
      severity: 'secondary',
      summary: `Lote ${n} descartado`,
      detail: `${count} muestras volvieron a su workspace recomendado`,
      life: 3800,
    });
  }

  async onSendGroup(groupId: string): Promise<void> {
    const result = await this.service.send(groupId, 'group');
    if (!result) return;
    this.emitSendToast(result);
  }

  async onSendLote(loteId: string): Promise<void> {
    const result = await this.service.send(loteId, 'lote');
    if (!result) return;
    this.emitSendToast(result);
  }

  onUpdateDestGroup(groupId: string, patch: Partial<TransitoDest>): void {
    this.service.updateDest({ kind: 'group', id: groupId }, patch);
  }
  onUpdateDestLote(loteId: string, patch: Partial<TransitoDest>): void {
    this.service.updateDest({ kind: 'lote', id: loteId }, patch);
  }
  onToggleEditing(groupId: string): void {
    this.service.toggleEditing(groupId);
  }
  onSetActiveLote(loteId: string): void {
    this.service.setActiveLote(this.service.activeLoteId() === loteId ? null : loteId);
  }
  onToggleAllGroup(groupId: string, on: boolean): void {
    const ids = this.service.groups().find(g => g.id === groupId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleAllLote(loteId: string, on: boolean): void {
    const ids = this.service.lotes().find(l => l.id === loteId)?.sampleIds ?? [];
    this.service.toggleSelMany(ids, on);
  }
  onToggleSample(id: string): void {
    this.service.toggleSel(id);
  }
  onClearSelection(): void {
    this.service.clearSel();
  }

  isLoteActive(loteId: string): boolean {
    return this.service.activeLoteId() === loteId;
  }
  isGroupEditing(groupId: string): boolean {
    return this.service.editing().has(groupId);
  }

  private emitSendToast(result: { enProceso: number; enTransito: number; detail: string }): void {
    const total = result.enProceso + result.enTransito;
    const target = result.enProceso > 0 ? 'En proceso' : 'En tránsito';
    this.messages.add({
      severity: 'success',
      summary: `${total} muestras → ${target}`,
      detail: result.detail,
      life: 3800,
    });
  }
}
