import * as L from 'leaflet';

//pin con forma de gota y una letra dentro. lo usamos para que se distinga
//de un vistazo el inicio (A, verde) y el final (B, rojo) de la ruta.
function pinConLetra(letra: string, color: string): L.DivIcon {
  //envoltorio rotado para hacer la gota, y un span contra-rotado para que
  //la letra quede recta. borde blanco + sombra para que destaque sobre el mapa.
  const html =
    `<div style="background:${color};width:30px;height:30px;` +
    `border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
    `display:flex;align-items:center;justify-content:center;` +
    `border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">` +
    `<span style="transform:rotate(45deg);color:white;font-weight:bold;` +
    `font-size:14px;font-family:sans-serif;">${letra}</span>` +
    `</div>`;

  return L.divIcon({
    html,
    className: 'route-marker',
    iconSize: [30, 30],
    //ancla en la punta inferior de la gota
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

//marcador del punto de salida de la ruta
export function iconoOrigen(): L.DivIcon {
  return pinConLetra('A', '#198754');
}

//marcador del destino de la ruta
export function iconoDestino(): L.DivIcon {
  return pinConLetra('B', '#dc3545');
}
