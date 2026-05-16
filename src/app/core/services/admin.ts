import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//llamadas del panel de administracion
export type IncidentType = 'ACCIDENT' | 'ROADWORK' | 'EVENT';

export type UserRole = 'USER' | 'ADMIN';

export interface AdminUser {
  id: number;
  name: string;
  mail: string;
  rol: UserRole;
  status: boolean;
  created_at?: string;
}

//campos opcionales para edicion parcial
export interface AdminUserPayload {
  name?: string;
  mail?: string;
  rol?: UserRole;
  status?: boolean;
}

export interface DashboardData {
  users_total: number;
  users_active: number;
  users_inactive: number;
  incidents_total: number;
  incidents_active: number;
}

export interface IncidentSummary {
  id: number;
  type: IncidentType;
  active: boolean;
  title?: string | null;
  description?: string | null;
  lat: number;
  lon: number;
}

export interface IncidentPayload {
  type: IncidentType;
  lat: number;
  lon: number;
  active?: boolean;
  title?: string | null;
  description?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  //totales para las cards del dashboard
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/admin/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  //listado publico de incidencias
  getIncidents(): Observable<IncidentSummary[]> {
    return this.http.get<IncidentSummary[]>(`${this.apiUrl}/incidents`);
  }

  createIncident(payload: IncidentPayload): Observable<IncidentSummary> {
    return this.http.post<IncidentSummary>(
      `${this.apiUrl}/admin/incidents`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateIncident(incidentId: number, payload: Partial<IncidentPayload>): Observable<IncidentSummary> {
    return this.http.put<IncidentSummary>(
      `${this.apiUrl}/admin/incidents/${incidentId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  //soft delete, deja active=false
  deleteIncident(incidentId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/admin/incidents/${incidentId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  //dispara el calculo de predicciones (PC1)
  runPredictions(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/admin/predictions/run`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/admin/users`, {
      headers: this.getAuthHeaders()
    });
  }

  //detalle con perfil y vehiculos
  getUserDetail(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUser(userId: number, payload: AdminUserPayload): Observable<AdminUser> {
    return this.http.put<AdminUser>(
      `${this.apiUrl}/admin/users/${userId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  //no borra, solo pone status=false
  deactivateUser(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/admin/users/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
