import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';

import {
  selectCurrentSucursal, selectSchedules, selectContacts, selectWorkspaces, selectTotemConfig,
  selectAreas,
} from '../../../../store/sucursal.selectors';
import { loadDetail } from '../../../../store/sucursal.actions';
import { DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';
import { ContactType } from '../../../../models/branch-contact.model';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
  FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  FULL_DAY: 'Día completo', MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche',
};

const CONTACT_LABELS: Record<ContactType, string> = {
  PHONE: 'Teléfono', MOBILE: 'Celular', EMAIL: 'Email',
  WHATSAPP: 'WhatsApp', FAX: 'Fax', WEBSITE: 'Sitio web',
};

@Component({
  selector: 'app-confirmar-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CardModule, DividerModule],
  templateUrl: './confirmar-step.component.html',
  styleUrl: './confirmar-step.component.scss',
})
export class ConfirmarStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() finish = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);

  protected readonly current = this.store.selectSignal(selectCurrentSucursal);
  protected readonly schedules = this.store.selectSignal(selectSchedules);
  protected readonly contacts = this.store.selectSignal(selectContacts);
  protected readonly workspaces = this.store.selectSignal(selectWorkspaces);
  protected readonly totemConfig = this.store.selectSignal(selectTotemConfig);
  protected readonly areas = this.store.selectSignal(selectAreas);

  ngOnInit() {
    // Refrescar todo para tener datos consistentes en el resumen
    this.store.dispatch(loadDetail({ branchId: this.branchId }));
  }

  dayLabel(d: DayOfWeek): string { return DAY_LABELS[d] ?? d; }
  scheduleTypeLabel(t: ScheduleType): string { return TYPE_LABELS[t] ?? t; }
  contactLabel(t: ContactType): string { return CONTACT_LABELS[t] ?? t; }

  areaName(areaId: number): string {
    return this.areas().find(a => a.id === areaId)?.name ?? `Área #${areaId}`;
  }
}
