export type BoxType = 'ATENCION' | 'EXTRACCION';

export interface BoxOccupation {
  id: number;
  branchId: number;
  userId: number;
  userName: string;
  boxType: BoxType;
  boxNumber: number;
  occupiedAt: string;
}

export interface OccupyBoxInput {
  boxType: BoxType;
  boxNumber: number;
}
