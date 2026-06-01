import {
  ChangeDetectionStrategy, Component, Input, OnInit, computed, effect, inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { selectContacts } from '../../../../store/sucursal.selectors';
import { loadContacts, addContact, deleteContact } from '../../../../store/sucursal.actions';
import { ContactType } from '../../../../models/branch-contact.model';

const CONTACT_TYPE_OPTIONS: Array<{
  label: string;
  value: ContactType;
  inputType: string;
  placeholder: string;
  validators: ValidatorFn[];
}> = [
  { label: 'Teléfono', value: 'PHONE', inputType: 'tel', placeholder: '+54 351 4001234', validators: [Validators.required, Validators.pattern(/^[+\d\s()-]{6,}$/)] },
  { label: 'Celular', value: 'MOBILE', inputType: 'tel', placeholder: '+54 9 351 4001234', validators: [Validators.required, Validators.pattern(/^[+\d\s()-]{6,}$/)] },
  { label: 'Email', value: 'EMAIL', inputType: 'email', placeholder: 'info@laboratorio.com', validators: [Validators.required, Validators.email] },
  { label: 'WhatsApp', value: 'WHATSAPP', inputType: 'tel', placeholder: '+54 9 351 4001234', validators: [Validators.required, Validators.pattern(/^[+\d\s()-]{6,}$/)] },
  { label: 'Fax', value: 'FAX', inputType: 'tel', placeholder: '+54 351 4001234', validators: [Validators.required, Validators.pattern(/^[+\d\s()-]{6,}$/)] },
  { label: 'Sitio web', value: 'WEBSITE', inputType: 'url', placeholder: 'https://laboratorio.com', validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/)] },
];

@Component({
  selector: 'app-contactos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TableModule, ButtonModule, SelectModule, InputTextModule],
  templateUrl: './contactos-step.component.html',
  styleUrl: './contactos-step.component.scss',
})
export class ContactosStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private store = inject(Store);
  private fb = inject(FormBuilder);

  protected readonly contacts = this.store.selectSignal(selectContacts);
  protected readonly typeOptions = CONTACT_TYPE_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    contactType: ['PHONE' as ContactType, Validators.required],
    value: ['', [Validators.required]],
  });

  // Signal reactivo del contactType para que currentTypeConfig se recalcule
  // al cambiar el select. form.value.contactType no es reactivo en computed().
  private readonly contactTypeSignal = toSignal(this.form.controls.contactType.valueChanges, {
    initialValue: this.form.controls.contactType.value,
  });

  protected readonly currentTypeConfig = computed(() => {
    const type = this.contactTypeSignal() ?? 'PHONE';
    return CONTACT_TYPE_OPTIONS.find(o => o.value === type) ?? CONTACT_TYPE_OPTIONS[0];
  });

  constructor() {
    effect(() => {
      this.currentTypeConfig();
      this.syncValidators();
    });
  }

  private syncValidators() {
    const cfg = this.currentTypeConfig();
    this.form.controls.value.setValidators(cfg.validators);
    this.form.controls.value.updateValueAndValidity({ emitEvent: false });
  }

  ngOnInit() {
    this.store.dispatch(loadContacts({ branchId: this.branchId }));
  }

  add() {
    if (this.form.invalid) return;
    const input = this.form.getRawValue();
    this.store.dispatch(addContact({ branchId: this.branchId, input }));
    this.form.reset({ contactType: 'PHONE', value: '' });
  }

  remove(id: number) {
    this.store.dispatch(deleteContact({ branchId: this.branchId, id }));
  }

  labelForType(type: ContactType): string {
    return CONTACT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
  }
}
