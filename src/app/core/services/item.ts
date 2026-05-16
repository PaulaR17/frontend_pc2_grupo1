import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Servicio para items, inventario y logros del usuario.
// Endpoints:
//   GET /items
//   GET /users/{id}/inventory
//   GET /users/{id}/badges

// Tipos de item que admite el backend.
export type ItemType = 'HAT' | 'GLASSES' | 'SUIT';

// Un item del catálogo de la tienda.
export interface Item {
  id: number;
  name: string;
  type: ItemType;
  rarity: string | null;
  description: string | null;
  image: string | null;
  price: number;
  active: boolean;
}

// Una fila del inventario del usuario.
export interface InventoryRow {
  id: number;
  user_id: number;
  item_id: number;
  quantity: number;
}

// Un logro obtenido por el usuario.
export interface UserBadge {
  id: number;
  user_id: number;
  code: string;
  earned_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Catálogo de items disponibles en la tienda.
  getCatalog(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.apiUrl}/items`, {
      headers: this.getAuthHeaders()
    });
  }

  // Items que ya tiene el usuario.
  getInventory(userId: number): Observable<InventoryRow[]> {
    return this.http.get<InventoryRow[]>(`${this.apiUrl}/users/${userId}/inventory`, {
      headers: this.getAuthHeaders()
    });
  }

  // Logros conseguidos por el usuario.
  getBadges(userId: number): Observable<UserBadge[]> {
    return this.http.get<UserBadge[]>(`${this.apiUrl}/users/${userId}/badges`, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
