//ORS devuelve la geometria de la ruta como un polyline encoded (algoritmo
//de Google: una cadena de caracteres que comprime miles de coordenadas).
//esta funcion lo decodifica a un array de [lat, lng] que Leaflet pinta directo.

export function decodePolyline(encoded: string): [number, number][] {
  const puntos: [number, number][] = [];

  if (encoded && encoded.length > 0) {
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      //leemos la latitud (delta respecto al punto anterior, codificado en bloques de 5 bits)
      let resultado = 0;
      let desplazamiento = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index = index + 1;
        resultado = resultado | ((byte & 0x1f) << desplazamiento);
        desplazamiento = desplazamiento + 5;
      } while (byte >= 0x20);
      const dlat = (resultado & 1) !== 0 ? ~(resultado >> 1) : (resultado >> 1);
      lat = lat + dlat;

      //ahora la longitud con el mismo esquema
      resultado = 0;
      desplazamiento = 0;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index = index + 1;
        resultado = resultado | ((byte & 0x1f) << desplazamiento);
        desplazamiento = desplazamiento + 5;
      } while (byte >= 0x20);
      const dlng = (resultado & 1) !== 0 ? ~(resultado >> 1) : (resultado >> 1);
      lng = lng + dlng;

      puntos.push([lat * 1e-5, lng * 1e-5]);
    }
  }

  return puntos;
}
