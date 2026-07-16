import { NbuVersion } from '../models/catalogs.model';

/**
 * Catálogo fijo de versiones NBU.
 *
 * El módulo coverages del backend todavía no expone un endpoint de versiones
 * NBU, así que esto queda como catálogo local hasta que exista. El resto de los
 * datos de obras sociales (insurers, planes, tipos, contactos) ya viene del
 * backend real vía `ObraSocialService` — el seed hardcodeado se eliminó.
 */
export const NBU_VERSIONS: NbuVersion[] = [
  { id: 1, versionCode: '2012_2016', publicationYear: 2012, effectivityDate: '2012-01-01' },
  { id: 2, versionCode: '2017_2020', publicationYear: 2017, effectivityDate: '2017-01-01' },
  { id: 3, versionCode: '2021_2024', publicationYear: 2021, effectivityDate: '2021-01-01' },
];
