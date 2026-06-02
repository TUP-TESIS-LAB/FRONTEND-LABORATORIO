export interface Section {
  id: number;
  name: string;
  areaId: number;
  active: boolean;
}

export interface SectionCreateInput {
  name: string;
  areaId: number;
}
