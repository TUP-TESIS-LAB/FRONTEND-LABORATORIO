// FRONTEND-LABORATORIO/src/app/shared/ui/components/form-stepper-header/form-step.ts

export interface FormStep<K extends string = string> {
  readonly key: K;
  readonly title: string;
  readonly subtitle: string;
  readonly required: boolean;
}
