import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { forkJoin, map, of, switchMap } from 'rxjs';

import {
  selectCurrentSucursal, selectSchedules, selectContacts,
  selectWorkspaces, selectAreas, selectSections, selectTotemConfig,
} from '../../../../store/sucursal.selectors';
import { DayOfWeek, ScheduleType } from '../../../../models/branch-schedule.model';
import { ContactType } from '../../../../models/branch-contact.model';
import { GeographyService } from '../../../../services/geography.service';

const DAY_ABBR: Record<DayOfWeek, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
  FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};
const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  FULL_DAY: 'Día completo', MORNING: 'Mañana', AFTERNOON: 'Tarde', NIGHT: 'Noche',
};
const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  PHONE: 'Teléfono', MOBILE: 'Celular', EMAIL: 'Email',
  WHATSAPP: 'WhatsApp', FAX: 'Fax', WEBSITE: 'Sitio web',
};

interface AreaResumen { areaName: string; sections: string[]; }

/**
 * Paso "Confirmar": resumen legible (sin IDs) de todo lo cargado en los pasos
 * previos. Lee los mismos selectors del store de sucursal en alta. Los nombres
 * de ciudad/provincia se resuelven contra la geografía (la dirección guarda IDs).
 */
@Component({
  selector: 'app-confirmar-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './confirmar-step.component.html',
  styleUrl: './confirmar-step.component.scss',
})
export class ConfirmarStepComponent {
  private readonly store = inject(Store);
  private readonly geography = inject(GeographyService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly current = this.store.selectSignal(selectCurrentSucursal);
  private readonly schedules = this.store.selectSignal(selectSchedules);
  private readonly contacts = this.store.selectSignal(selectContacts);
  private readonly workspaces = this.store.selectSignal(selectWorkspaces);
  private readonly areas = this.store.selectSignal(selectAreas);
  private readonly sections = this.store.selectSignal(selectSections);
  private readonly totemConfig = this.store.selectSignal(selectTotemConfig);

  /** cityId -> { ciudad, provincia } para resolver la dirección a nombres. */
  private readonly cityIndex = signal<Map<number, { city: string; province: string }>>(new Map());

  constructor() {
    this.geography.listProvinces().pipe(
      switchMap((provinces) => provinces.length === 0
        ? of([] as { city: string; province: string; id: number }[])
        : forkJoin(provinces.map((p) => this.geography.listCitiesByProvince(p.id).pipe(
            map((cities) => cities.map((c) => ({ id: c.id, city: c.name, province: p.name }))),
          ))).pipe(map((groups) => groups.flat()))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((entries) => {
      const idx = new Map<number, { city: string; province: string }>();
      for (const e of entries) idx.set(e.id, { city: e.city, province: e.province });
      this.cityIndex.set(idx);
    });
  }

  // ── Datos ──
  protected readonly nombre = computed(() => this.current()?.code ?? '');

  protected readonly direccion = computed<string>(() => {
    const addr = this.current()?.address;
    if (!addr) return 'Sin dirección';
    const parts: string[] = [];
    const calle = [addr.street, addr.streetNumber].filter((v) => !!v && v.trim()).join(' ').trim();
    if (calle) parts.push(calle);
    if (addr.cityId != null) {
      const geo = this.cityIndex().get(addr.cityId);
      if (geo) { parts.push(geo.city); parts.push(geo.province); }
    }
    return parts.length > 0 ? parts.join(', ') : 'Sin dirección';
  });

  // ── Horarios ──
  protected readonly horarioLineas = computed<string[]>(() =>
    this.schedules().map((s) => {
      const dias = s.dayFrom === s.dayTo
        ? DAY_ABBR[s.dayFrom]
        : `${DAY_ABBR[s.dayFrom]}–${DAY_ABBR[s.dayTo]}`;
      return `${dias} · ${s.fromTime}–${s.toTime} · ${SCHEDULE_TYPE_LABELS[s.scheduleType]}`;
    }),
  );

  // ── Contactos ──
  protected readonly contactoLineas = computed<string[]>(() =>
    this.contacts().map((c) => `${CONTACT_TYPE_LABELS[c.contactType]}: ${c.value}`),
  );

  // ── Áreas y secciones ──
  protected readonly areaLineas = computed<AreaResumen[]>(() => {
    const byArea = new Map<number, AreaResumen>();
    for (const w of this.workspaces()) {
      let grp = byArea.get(w.areaId);
      if (!grp) {
        grp = { areaName: this.areaName(w.areaId), sections: [] };
        byArea.set(w.areaId, grp);
      }
      grp.sections.push(this.sectionName(w.sectionId));
    }
    return [...byArea.values()];
  });

  // ── Tótem ──
  protected readonly totemHabilitado = computed(() => this.totemConfig()?.enabled ?? false);
  protected readonly boxesAtencion = computed(() => this.current()?.atencionBoxesCount ?? 0);
  protected readonly boxesExtraccion = computed(() => this.current()?.extraccionBoxesCount ?? 0);

  // ── Pantallas ──
  protected readonly pantallaAtencion = computed(() => this.totemConfig()?.atencionDisplayEnabled ?? false);
  protected readonly pantallaExtraccion = computed(() => this.totemConfig()?.extraccionDisplayEnabled ?? false);

  protected siNo(v: boolean): string { return v ? 'Sí' : 'No'; }

  private areaName(areaId: number): string {
    return this.areas().find((a) => a.id === areaId)?.name ?? `Área #${areaId}`;
  }
  private sectionName(sectionId: number): string {
    return this.sections().find((s) => s.id === sectionId)?.name ?? `Sección #${sectionId}`;
  }
}
