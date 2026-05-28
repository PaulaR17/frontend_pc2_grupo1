//formatos legibles para mostrar distancia/duracion de una ruta. evitamos
//que el usuario vea cosas como "0.3 km" o "78.5 min": preferimos "300 m"
//y "1 h 19 min" respectivamente.

export function formatearDuracion(minutos: number | null | undefined): string {
  let texto = '-';

  if (typeof minutos === 'number' && isFinite(minutos)) {
    const min = Math.max(0, Math.round(minutos));
    if (min >= 60) {
      const horas = Math.floor(min / 60);
      const restoMin = min % 60;
      texto = restoMin === 0 ? `${horas} h` : `${horas} h ${restoMin} min`;
    } else {
      texto = `${min} min`;
    }
  }

  return texto;
}

export function formatearMetros(metros: number | null | undefined): string {
  let texto = '';

  if (typeof metros === 'number' && isFinite(metros) && metros >= 0) {
    if (metros >= 1000) {
      //una cifra decimal para los km, mejor que "1.234 km" o "1 km"
      texto = `${(metros / 1000).toFixed(1)} km`;
    } else {
      texto = `${Math.round(metros)} m`;
    }
  }

  return texto;
}
