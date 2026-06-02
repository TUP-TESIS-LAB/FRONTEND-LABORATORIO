export interface FormStep<K extends string = string> {
  readonly key: K;
  readonly title: string;
  readonly subtitle?: string;
  readonly required?: boolean;
}
