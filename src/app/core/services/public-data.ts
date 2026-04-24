import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicDataService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api'; 

  // POST /api/guest/sessions
  createGuestSession(): Observable<any> {
    return this.http.post(`${this.apiUrl}/guest/sessions`, {});
  }

  // GET /api/guest/sessions/{sessionId}/quota
  getQuota(sessionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/guest/sessions/${sessionId}/quota`);
  }

  // POST /api/guest/sessions/{sessionId}/routes
  searchByZone(sessionId: string, zoneName: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/guest/sessions/${sessionId}/routes`, {
    zone: zoneName,      // Prueba cambiando 'destination' por 'zone'
    name: zoneName       // O añade ambos para asegurar
  });
}
}