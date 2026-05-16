// Centroides aproximados de los 21 distritos de Madrid.
// Los usamos para pintar las predicciones en el mapa (la BD guarda
// la predicción asociada al distrito, no a un punto concreto).

export interface DistrictCentroid {
  code: number;
  name: string;
  lat: number;
  lon: number;
}

export const MADRID_DISTRICT_CENTROIDS: DistrictCentroid[] = [
  { code: 1,  name: 'Centro',              lat: 40.4150, lon: -3.7074 },
  { code: 2,  name: 'Arganzuela',          lat: 40.3982, lon: -3.6950 },
  { code: 3,  name: 'Retiro',              lat: 40.4115, lon: -3.6782 },
  { code: 4,  name: 'Salamanca',           lat: 40.4270, lon: -3.6812 },
  { code: 5,  name: 'Chamartín',           lat: 40.4593, lon: -3.6761 },
  { code: 6,  name: 'Tetuán',              lat: 40.4598, lon: -3.6975 },
  { code: 7,  name: 'Chamberí',            lat: 40.4340, lon: -3.7038 },
  { code: 8,  name: 'Fuencarral-El Pardo', lat: 40.4779, lon: -3.7100 },
  { code: 9,  name: 'Moncloa-Aravaca',     lat: 40.4352, lon: -3.7313 },
  { code: 10, name: 'Latina',              lat: 40.4037, lon: -3.7368 },
  { code: 11, name: 'Carabanchel',         lat: 40.3818, lon: -3.7279 },
  { code: 12, name: 'Usera',               lat: 40.3826, lon: -3.7097 },
  { code: 13, name: 'Puente de Vallecas',  lat: 40.3869, lon: -3.6667 },
  { code: 14, name: 'Moratalaz',           lat: 40.4072, lon: -3.6570 },
  { code: 15, name: 'Ciudad Lineal',       lat: 40.4457, lon: -3.6510 },
  { code: 16, name: 'Hortaleza',           lat: 40.4744, lon: -3.6411 },
  { code: 17, name: 'Villaverde',          lat: 40.3459, lon: -3.7114 },
  { code: 18, name: 'Villa de Vallecas',   lat: 40.3700, lon: -3.6200 },
  { code: 19, name: 'Vicálvaro',           lat: 40.4042, lon: -3.6081 },
  { code: 20, name: 'San Blas-Canillejas', lat: 40.4289, lon: -3.6097 },
  { code: 21, name: 'Barajas',             lat: 40.4737, lon: -3.5796 },
];

// Búsqueda rápida por código.
export function getCentroid(districtCode: number): DistrictCentroid | null {
  return MADRID_DISTRICT_CENTROIDS.find(d => d.code === districtCode) || null;
}
