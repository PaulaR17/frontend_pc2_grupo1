import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

//un punto de interes en formato plano para pintarlo facil con Leaflet.
//group es la familia de ORS (tourism, leisure, catering...) que usamos para
//elegir el icono; category es la etiqueta concreta (museum, restaurant...)
export interface Poi {
  name: string;
  category: string;
  group: string;
  lat: number;
  lng: number;
  distance?: number;
}

//cada feature que llega del backend (proxy a ORS POIs) viene como GeoJSON;
//esta es la forma minima que nos interesa para extraer los datos
interface GeoFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    distance?: number;
    category_ids?: { [id: string]: { category_name: string; category_group: string } };
    osm_tags?: { name?: string };
  };
}

@Injectable({
  providedIn: 'root'
})
export class PoiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  //consulta POIs dentro del radio en metros desde un centro lat/lon.
  //el backend devuelve GeoJSON y aqui lo aplanamos a Poi[].
  //filtramos a categorias utiles para un usuario que navega (restaurantes,
  //sitios turisticos y ocio) para no inundar el mapa de buzones y bancos.
  search(lat: number, lng: number, radioMetros: number, limite: number = 20): Observable<Poi[]> {
    const body = {
      center: { lat, lon: lng },
      radius_m: radioMetros,
      limit: limite,
      sortby: 'distance',
      filters: {
        category_group_ids: [130, 220, 420],
      },
    };

    return this.http.post<{ features: GeoFeature[] }>(`${this.apiUrl}/pois/search`, body).pipe(
      map((res) => {
        const features = res?.features ?? [];
        const lista: Poi[] = [];
        for (const f of features) {
          const coords = f.geometry?.coordinates;
          //el primer category_id que traiga la feature nos sirve como etiqueta
          const cats = f.properties?.category_ids ?? {};
          const primera = Object.values(cats)[0];
          const nombreCat = primera?.category_name ?? 'poi';
          const grupoCat = primera?.category_group ?? '';
          const nombre = f.properties?.osm_tags?.name ?? nombreCat;
          const valido = Array.isArray(coords) && coords.length === 2;
          if (valido) {
            lista.push({
              name: nombre,
              category: nombreCat,
              group: grupoCat,
              lat: coords[1],
              lng: coords[0],
              distance: f.properties?.distance,
            });
          }
        }
        return lista;
      })
    );
  }
}
