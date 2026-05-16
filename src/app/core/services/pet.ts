import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Servicio para la mascota virtual del usuario.
// Llama a los endpoints:
//   GET  /users/{id}/pet
//   PUT  /users/{id}/pet

// Estructura de la mascota tal como la devuelve el backend.
export interface Pet {
  id: number;
  user_id: number;
  name: string;
  level: number;
  xp: number;
  image: string | null;
  updated_at?: string | null;
}

// Lo que enviamos al backend cuando actualizamos.
// Todos los campos son opcionales por si solo cambia uno.
export interface PetPayload {
  name?: string;
  level?: number;
  xp?: number;
  image?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PetService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Obtiene la mascota actual del usuario.
  getPet(userId: number): Observable<Pet> {
    return this.http.get<Pet>(`${this.apiUrl}/users/${userId}/pet`, {
      headers: this.getAuthHeaders()
    });
  }

  // Guarda los cambios de la mascota.
  updatePet(userId: number, payload: PetPayload): Observable<Pet> {
    return this.http.put<Pet>(`${this.apiUrl}/users/${userId}/pet`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  // Cabeceras con el JWT guardado en localStorage.
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
