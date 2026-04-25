import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicDataService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

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

  calculateGuestRoute(sessionId: string, destination: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/guest/sessions/${sessionId}/routes?include=summary`, {
      origin: {
        lat: 40.4167,
        lon: -3.7033
      },
      destination: {
        lat: destination.lat,
        lon: destination.lon
      },
      profile: 'driving-car'
    });
  }
}