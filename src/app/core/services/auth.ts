import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  login(data: { mail: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, data).pipe(
      tap((response: any) => {
        this.saveSession(response);
      })
    );
  }

  register(data: {
    name: string;
    mail: string;
    password: string;
    password_confirmation: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data).pipe(
      tap((response: any) => {
        this.saveSession(response);
      })
    );
  }

  me(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    });
  }

  getUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUser(userId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  logoutRequest(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/logout`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_mail');
    localStorage.removeItem('user_role');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUserId(): number | null {
    const rawId = localStorage.getItem('user_id');

    if (!rawId) {
      return null;
    }

    return Number(rawId);
  }

  getCurrentUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private saveSession(response: any): void {
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
    }

    if (response.user) {
      localStorage.setItem('user_id', String(response.user.id));
      localStorage.setItem('user_name', response.user.name ?? '');
      localStorage.setItem('user_mail', response.user.mail ?? '');
      localStorage.setItem('user_role', response.user.rol ?? '');
    }
  }
}