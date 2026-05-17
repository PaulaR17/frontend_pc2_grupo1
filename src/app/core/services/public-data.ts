import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//endpoints publicos para invitados (sin login)
export interface LocationSuggestion {
  id?: string | null;
  text: string;
  name?: string | null;
  type?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
}

@Injectable({
  providedIn: 'root'
})
export class PublicDataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  createGuestSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/guest/sessions`, {});
  }

  getQuota(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/guest/sessions/${sessionId}/quota`);
  }

  searchLocation(query: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/locations/search?q=${encodeURIComponent(query)}&limit=5`
    );
  }

  //calcula ruta entre dos puntos. si no se pasa origen, se asume la Puerta
  //del Sol. pedimos geometry tambien para pintar la linea de la ruta en el mapa
  calculateGuestRoute(
    sessionId: string,
    destination: LocationSuggestion,
    origin?: LocationSuggestion | null,
  ): Observable<any> {
    const origenLat = origin?.lat ?? 40.4167;
    const origenLon = origin?.lon ?? -3.7033;

    return this.http.post(`${this.apiUrl}/guest/sessions/${sessionId}/routes?include=summary,geometry`, {
      origin: { lat: origenLat, lon: origenLon },
      destination: { lat: destination.lat, lon: destination.lon },
      profile: 'driving-car',
    });
  }
}
