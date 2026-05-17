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

//fila de la tabla equipment: que item lleva equipado el usuario en cada slot
export interface EquipmentRow {
  id: number;
  user_id: number;
  slot: string;
  item_id: number | null;
}

export interface UserBadge {
  id: number;
  user_id: number;
  code: string;
  earned_at: string | null;
}

//balance de chapitas del usuario y ultimos movimientos
export interface WalletInfo {
  user_id: number;
  balance: number;
  recent: Array<{
    id: number;
    type: string;
    amount: number;
    created_at: string;
  }>;
}

//respuesta tras una compra exitosa
export interface PurchaseResult {
  ok: boolean;
  item: Item;
  inventory_id: number;
  balance: number;
}

//resumen de la recompensa que se otorga tras una accion (ruta, reporte...)
export interface RewardInfo {
  coins: number;
  xp: number;
  level_up: boolean;
  new_level: number | null;
  action: string;
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

  //balance de chapitas + ultimos movimientos
  getWallet(userId: number): Observable<WalletInfo> {
    return this.http.get<WalletInfo>(`${this.apiUrl}/users/${userId}/wallet`, {
      headers: this.getAuthHeaders()
    });
  }

  //slots equipados del usuario (con item_id no nulo)
  getEquipment(userId: number): Observable<EquipmentRow[]> {
    return this.http.get<EquipmentRow[]>(`${this.apiUrl}/users/${userId}/equipment`, {
      headers: this.getAuthHeaders()
    });
  }

  //equipa (itemId con valor) o desequipa (itemId=null) un slot
  updateEquipment(
    userId: number,
    slot: string,
    itemId: number | null
  ): Observable<EquipmentRow> {
    return this.http.put<EquipmentRow>(
      `${this.apiUrl}/users/${userId}/equipment`,
      { slot, item_id: itemId },
      { headers: this.getAuthHeaders() }
    );
  }

  //compra un item de la tienda; el backend valida saldo y duplicados
  purchase(userId: number, itemId: number): Observable<PurchaseResult> {
    return this.http.post<PurchaseResult>(
      `${this.apiUrl}/users/${userId}/purchases`,
      { item_id: itemId },
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
