/** Matches AddressResponse (GET) and AddressRequest (POST/PUT) */
export interface Address {
  id?: number;
  street?: string;
  streetNumber?: string;
  // Dirección texto-libre (alineada a la del paciente).
  neighborhood?: string;
  city?: string;
  province?: string;
  // Legacy (wizard de sucursales).
  cityId?: number;
  neighborhoodId?: number;
}
