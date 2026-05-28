//utilidades para repartir muestras de busqueda a lo largo de una polyline.
//las usamos para pedir POIs de forma uniforme por toda la ruta y que no se
//amontonen solo al principio, al medio y al final.

//distancia aproximada en metros entre dos puntos lat/lng (formula haversine)
export function distanciaMetros(a: [number, number], b: [number, number]): number {
  const radioTierra = 6371000;
  const phi1 = (a[0] * Math.PI) / 180;
  const phi2 = (b[0] * Math.PI) / 180;
  const dPhi = ((b[0] - a[0]) * Math.PI) / 180;
  const dLambda = ((b[1] - a[1]) * Math.PI) / 180;

  const x =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  return 2 * radioTierra * Math.asin(Math.sqrt(x));
}

//recorre la polyline acumulando distancia y devuelve un punto cada
//"pasoMetros". garantiza que el primer y ultimo punto siempre estan
//incluidos. tope superior con maxPuntos para no disparar la API
export function muestrearRuta(
  ruta: [number, number][],
  pasoMetros: number,
  maxPuntos: number
): [number, number][] {
  const muestras: [number, number][] = [];

  if (ruta.length > 0) {
    muestras.push(ruta[0]);

    let recorrido = 0;
    let ultimoCorte = 0;

    for (let i = 1; i < ruta.length; i++) {
      recorrido += distanciaMetros(ruta[i - 1], ruta[i]);

      const lleno = muestras.length >= maxPuntos - 1;
      const tocaMuestra = recorrido - ultimoCorte >= pasoMetros;

      if (tocaMuestra && !lleno) {
        muestras.push(ruta[i]);
        ultimoCorte = recorrido;
      }
    }

    //aseguramos que el destino tambien aparece (si no coincide ya)
    const ultimo = ruta[ruta.length - 1];
    const cola = muestras[muestras.length - 1];
    const yaIncluido = cola[0] === ultimo[0] && cola[1] === ultimo[1];
    if (!yaIncluido) {
      muestras.push(ultimo);
    }
  }

  return muestras;
}
