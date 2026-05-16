import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
//  Servicio para las llamadas del panel de administración.
//  Centraliza:
//    - GET    /admin/dashboard          (totales)
//    - GET    /incidents                (listado público)
//    - POST   /admin/incidents          (crear)
//    - PUT    /admin/incidents/{id}     (editar)
//    - DELETE /admin/incidents/{id}     (cerrar / soft delete)
//    - POST   /admin/predictions/run    (ejecutar predicciones)
//    - GET    /admin/users              (listado de usuarios)
//    - PUT    /admin/users/{id}         (editar usuario)
//    - DELETE /admin/users/{id}         (desactivar usuario)
// ============================================================

// Tipos de incidencia que admite el backend.
export type IncidentType = 'ACCIDENT' | 'ROADWORK' | 'EVENT';

// Roles posibles del usuario.
export type UserRole = 'USER' | 'ADMIN';

// Un usuario tal como lo devuelve /admin/users.
export interface AdminUser {
  id: number;
  name: string;
  mail: string;
  rol: UserRole;
  status: boolean;
  created_at?: string;
}

// Lo que enviamos al backend al editar un usuario.
// Todos los campos son opcionales (PATCH-style).
export interface AdminUserPayload {
  name?: string;
  mail?: string;
  rol?: UserRole;
  status?: boolean;
}

// Lo que devuelve el endpoint GET /admin/dashboard
export interface DashboardData {
  users_total: number;
  users_active: number;
  users_inactive: number;
  incidents_total: number;
  incidents_active: number;
}

// Representación de una incidencia.
export interface IncidentSummary {
  id: number;
  type: IncidentType;
  active: boolean;
  title?: string | null;
  description?: string | null;
  lat: number;
  lon: number;
}

// Datos que enviamos al backend al crear o editar.
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

  // Métricas globales para las cards y los gráficos.
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/admin/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  // Listado público de incidencias.
  getIncidents(): Observable<IncidentSummary[]> {
    return this.http.get<IncidentSummary[]>(`${this.apiUrl}/incidents`);
  }

  // Crea una nueva incidencia.
  createIncident(payload: IncidentPayload): Observable<IncidentSummary> {
    return this.http.post<IncidentSummary>(
      `${this.apiUrl}/admin/incidents`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Actualiza una incidencia existente.
  updateIncident(incidentId: number, payload: Partial<IncidentPayload>): Observable<IncidentSummary> {
    return this.http.put<IncidentSummary>(
      `${this.apiUrl}/admin/incidents/${incidentId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Cierra una incidencia (soft delete: pone active=false).
  deleteIncident(incidentId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/admin/incidents/${incidentId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Lanza el cálculo de predicciones en el backend.
  runPredictions(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/admin/predictions/run`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // -------------------------------------------------------
  //  GESTIÓN DE USUARIOS
  // -------------------------------------------------------

  // Lista todos los usuarios.
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/admin/users`, {
      headers: this.getAuthHeaders()
    });
  }

  // Detalle de un usuario (con perfil y vehículos).
  getUserDetail(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Actualiza datos de un usuario.
  updateUser(userId: number, payload: AdminUserPayload): Observable<AdminUser> {
    return this.http.put<AdminUser>(
      `${this.apiUrl}/admin/users/${userId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Desactiva un usuario (no se borra, solo status=false).
  deactivateUser(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/admin/users/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Cabeceras con el JWT almacenado en localStorage.
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
