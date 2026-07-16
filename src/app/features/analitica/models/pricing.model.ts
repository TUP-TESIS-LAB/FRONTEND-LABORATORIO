export interface AttentionPricingItem {
  analysisId: number;
  authorized: boolean;
  cantidadUb: number;
  valorUbParticular: number | null;
  precioPaciente: number;
}

export interface AttentionPricing {
  items: AttentionPricingItem[];
  subtotal: number;
  copayment: number;
  total: number;
}
