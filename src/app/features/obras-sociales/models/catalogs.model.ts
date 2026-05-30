import { InsurerTypeCode } from './insurer.model';

export interface InsurerType {
  name: InsurerTypeCode;
  description: string;
}

export interface NbuVersion {
  id: number;
  versionCode: string;            // ej. "2021_2024"
  publicationYear: number;
  effectivityDate: string;        // ISO
}

export interface NbuOption {
  label: string;
  value: number;
}
