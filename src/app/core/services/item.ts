import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

//items, inventario y chapitas del usuario
export type ItemType = 'HAT' | 'GLASSES' | 'SUIT';

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

export interface InventoryRow {
  id: number;
  user_id: number;
  item_id: number;
  quantity: number;
}

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

  //items activos del catalogo
  getCatalog(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.apiUrl}/items`, {
      headers: this.getAuthHeaders()
    });
  }

  //items que tiene el usuario
  getInventory(userId: number): Observable<InventoryRow[]> {
    return this.http.get<InventoryRow[]>(`${this.apiUrl}/users/${userId}/inventory`, {
      headers: this.getAuthHeaders()
    });
  }

  //chapitas conseguidas
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
