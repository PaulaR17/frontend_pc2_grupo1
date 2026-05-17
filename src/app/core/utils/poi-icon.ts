import * as L from 'leaflet';

//mapeo de grupo ORS -> emoji + color de fondo. asi el usuario distingue
//de un vistazo si un POI es gastronomia, ocio o turismo
const ICONOS_POR_GRUPO: { [grupo: string]: { emoji: string; bg: string } } = {
  catering:  { emoji: '🍴', bg: '#fd7e14' },
  tourism:   { emoji: '📷', bg: '#0d6efd' },
  leisure:   { emoji: '🌳', bg: '#198754' },
  sustenance:{ emoji: '🍴', bg: '#fd7e14' },
  shopping:  { emoji: '🛍️', bg: '#6f42c1' },
  accomodation: { emoji: '🏨', bg: '#0dcaf0' },
};

const POR_DEFECTO = { emoji: '📍', bg: '#6c757d' };

//crea un divIcon Leaflet con el emoji correspondiente al grupo del POI
export function iconoPoi(group: string): L.DivIcon {
  const cfg = ICONOS_POR_GRUPO[group] ?? POR_DEFECTO;
  const html = `<div style="background:${cfg.bg};color:white;width:28px;height:28px;` +
               `border-radius:50%;display:flex;align-items:center;justify-content:center;` +
               `font-size:15px;box-shadow:0 1px 4px rgba(0,0,0,0.3);border:2px solid white;">` +
               `${cfg.emoji}</div>`;

  return L.divIcon({
    html,
    className: 'poi-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}
