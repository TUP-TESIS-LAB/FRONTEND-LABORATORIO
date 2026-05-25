/** Matches AddressResponse (GET) and AddressRequest (POST/PUT) */
export interface Address {
  id?: number;
  street?: string;
  streetNumber?: string;
  cityId?: number;
  neighborhoodId?: number;
}
